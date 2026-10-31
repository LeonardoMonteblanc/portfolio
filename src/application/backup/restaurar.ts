// src/application/backup/restaurar.ts
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { Sql } from "postgres";
import { listarTabelasBase } from "./backup.service";
import { ordenarPorDependencia } from "./ordem";
import { VERSAO_FORMATO_BACKUP, type ManifestoBackup } from "./tipos";
import type { DestinoBackup } from "@/infrastructure/backup/destino";

/**
 * Restauração do backup lógico (RNF-027 / F9-11).
 *
 * Como funciona e por quê:
 *  1. confere `sha256` de cada arquivo antes de usar — restauração silenciosa de
 *     arquivo corrompido é pior que restauração nenhuma;
 *  2. remove as chaves estrangeiras, insere e recria as FKs ao final. É o único
 *     caminho sem superusuário (`session_replication_role` exige) e resolve
 *     auto-referências (categoria pai/filho) que nenhuma ordenação topológica
 *     consegue resolver;
 *  3. insere com `jsonb_populate_recordset`, que aplica o tipo de cada coluna:
 *     o NDJSON volta para uuid, timestamp, numeric e jsonb sem conversão manual;
 *  4. ao final compara contagem por tabela com o manifesto e devolve as
 *     divergências em vez de "deu certo" genérico.
 *
 * Só roda contra banco local por padrão: quem chama decide o
 * `DATABASE_URL`, mas o script de linha de comando recusa host remoto.
 */

export interface OpcoesRestauracao {
  manifesto: ManifestoBackup;
  lerArquivo: (chave: string) => Promise<Buffer>;
  limparTabelas?: boolean;
  cliente: Sql;
  lote?: number;
  aoProgresso?: (mensagem: string) => void;
}

export interface ResultadoRestauracao {
  porTabela: Array<{ nome: string; esperado: number; restaurado: number }>;
  divergencias: string[];
  chavesEstrangeirasRecriadas: number;
}

interface ConstraintFk {
  tabela: string;
  nome: string;
  definicao: string;
}

async function listarFks(cliente: Sql): Promise<ConstraintFk[]> {
  return cliente.unsafe<ConstraintFk[]>(
    `select c.conrelid::regclass::text as tabela,
            c.conname as nome,
            pg_get_constraintdef(c.oid) as definicao
       from pg_constraint c
       join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'
      order by 1, 2`,
  );
}

function citar(identificador: string): string {
  return `"${identificador.replace(/"/g, '""')}"`;
}

/** Reinicia sequências para o próximo id não colidir com o que foi restaurado. */
async function ajustarSequencias(cliente: Sql): Promise<void> {
  // Só `public`: as sequências do schema `drizzle` (controle de migrations) não
  // fazem parte do backup e precisam ficar como estão.
  const sequencias = await cliente.unsafe<
    Array<{ esquema: string; tabela: string; coluna: string }>
  >(
    `select n.nspname as esquema, t.relname as tabela, a.attname as coluna
       from pg_class s
       join pg_depend d on d.objid = s.oid and d.deptype in ('a', 'i')
       join pg_class t on t.oid = d.refobjid
       join pg_namespace n on n.oid = t.relnamespace
       join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
      where s.relkind = 'S' and t.relkind = 'r' and n.nspname = 'public'`,
  );

  for (const { esquema, tabela, coluna } of sequencias) {
    const qualificada = `${citar(esquema)}.${citar(tabela)}`;
    await cliente.unsafe(
      `select setval(pg_get_serial_sequence(${qualificada}, ${citar(coluna)}),
              coalesce((select max(${citar(coluna)}) from ${qualificada}), 1),
              (select max(${citar(coluna)}) from ${qualificada}) is not null)`,
    );
  }
}

export async function restaurarBackup(
  opcoes: OpcoesRestauracao,
): Promise<ResultadoRestauracao> {
  const { manifesto, cliente, lerArquivo } = opcoes;
  const lote = opcoes.lote ?? 500;
  const progresso = opcoes.aoProgresso ?? (() => {});

  if (manifesto.versao !== VERSAO_FORMATO_BACKUP) {
    throw new Error(
      `Manifesto na versão ${manifesto.versao}; este restaurador entende a ${VERSAO_FORMATO_BACKUP}.`,
    );
  }

  const existentes = new Set(await listarTabelasBase(cliente));
  const ausentes = manifesto.tabelas
    .map((t) => t.nome)
    .filter((nome) => !existentes.has(nome));

  if (ausentes.length > 0) {
    throw new Error(
      `O banco destino não tem ${ausentes.length} tabela(s) do backup (${ausentes.slice(0, 5).join(", ")}...). Aplique as migrations (pnpm db:migrate) antes de restaurar.`,
    );
  }

  const fks = await listarFks(cliente);
  const dependencias = await cliente.unsafe<
    Array<{ tabela: string; referencia: string }>
  >(
    `select c.conrelid::regclass::text as tabela,
            c.confrelid::regclass::text as referencia
       from pg_constraint c
       join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'`,
  );

  const ordemFinal = ordenarPorDependencia(
    manifesto.tabelas.map((t) => t.nome),
    dependencias,
  );

  for (const fk of fks) {
    await cliente.unsafe(
      `alter table ${fk.tabela} drop constraint ${citar(fk.nome)}`,
    );
  }

  progresso(`${fks.length} chave(s) estrangeira(s) suspensa(s)`);

  try {
    if (opcoes.limparTabelas) {
      await cliente.unsafe(
        `truncate table ${ordemFinal.map(citar).join(", ")} cascade`,
      );
      progresso("tabelas esvaziadas");
    }

    for (const tabela of ordemFinal) {
      const entrada = manifesto.tabelas.find((t) => t.nome === tabela);
      if (!entrada) continue;

      const comprimido = await lerArquivo(entrada.arquivo);
      const sha = createHash("sha256").update(comprimido).digest("hex");
      if (sha !== entrada.sha256) {
        throw new Error(
          `Arquivo ${entrada.arquivo} corrompido: sha256 ${sha} ≠ ${entrada.sha256}.`,
        );
      }

      const texto = gunzipSync(comprimido).toString("utf8");
      const linhas = texto
        .split("\n")
        .filter((linha) => linha.trim().length > 0)
        .map((linha) => JSON.parse(linha) as Record<string, unknown>);

      for (let i = 0; i < linhas.length; i += lote) {
        const pedaco = linhas.slice(i, i + lote);
        await cliente.unsafe(
          // `($1::text)::jsonb` em vez de `$1::jsonb`: com o cast direto o
          // postgres.js infere o parâmetro como jsonb e serializa a string de
          // novo — o Postgres recebe um escalar e responde "cannot call
          // jsonb_populate_recordset on a non-array". Forçando text o valor
          // chega byte a byte e o cast para jsonb acontece no servidor.
          `insert into ${citar(tabela)} select * from jsonb_populate_recordset(null::${citar(tabela)}, ($1::text)::jsonb)`,
          [JSON.stringify(pedaco)],
        );
      }

      progresso(`${tabela}: ${linhas.length} linha(s)`);
    }
  } finally {
    for (const fk of fks) {
      await cliente.unsafe(
        `alter table ${fk.tabela} add constraint ${citar(fk.nome)} ${fk.definicao}`,
      );
    }
  }

  await ajustarSequencias(cliente);

  try {
    await cliente.unsafe("refresh materialized view vw_auditoria_consolidada");
  } catch {
    // banco restaurado sem a view (migrations antigas): não é erro de restauração
  }

  const porTabela: ResultadoRestauracao["porTabela"] = [];
  const divergencias: string[] = [];

  for (const entrada of manifesto.tabelas) {
    const contagem = await cliente.unsafe<Array<{ total: number }>>(
      `select count(*)::int as total from ${citar(entrada.nome)}`,
    );
    const total = contagem[0]?.total ?? 0;
    porTabela.push({
      nome: entrada.nome,
      esperado: entrada.linhas,
      restaurado: total,
    });
    if (total !== entrada.linhas) {
      divergencias.push(
        `${entrada.nome}: esperado ${entrada.linhas}, restaurado ${total}`,
      );
    }
  }

  return { porTabela, divergencias, chavesEstrangeirasRecriadas: fks.length };
}

/** Escolhe o manifesto: do dia pedido ou o mais recente disponível. */
export async function carregarManifesto(
  destino: DestinoBackup,
  data?: string,
): Promise<{ manifesto: ManifestoBackup; chave: string }> {
  const chaves = await destino.listar("backups/");
  const manifestos = chaves
    .filter((chave) => chave.endsWith("/manifesto.json"))
    .filter((chave) => (data ? chave.startsWith(`backups/${data}/`) : true))
    .sort();

  const chave = manifestos.at(-1);
  if (!chave) {
    throw new Error(
      data
        ? `Não há backup de ${data} em ${destino.descricao}.`
        : `Nenhum manifesto encontrado em ${destino.descricao}.`,
    );
  }

  const manifesto = JSON.parse(
    (await destino.ler(chave)).toString("utf8"),
  ) as ManifestoBackup;

  return { manifesto, chave };
}
