// src/application/backup/backup.service.ts
import { createHash } from "node:crypto";
import { createGzip } from "node:zlib";
import { once } from "node:events";
import type { Sql } from "postgres";
import { sqlBruto } from "@/infrastructure/db/client";
import { env } from "@/shared/env";
import { obterConfiguracaoNumero } from "@/application/configuracao/configuracao.service";
import { aplicarRetencao } from "./retencao";
import type { DestinoBackup } from "@/infrastructure/backup/destino";
import {
  VERSAO_FORMATO_BACKUP,
  prefixoDoDia,
  type ManifestoBackup,
  type ResultadoBackup,
  type TabelaBackup,
} from "./tipos";

/**
 * Backup lógico diário (F9-11 / RF-068 / RNF-025).
 *
 * Decisões que não são óbvias:
 *  - exporta TODAS as tabelas base, inclusive as `log_*`: a trilha de auditoria
 *    é justamente o que precisa sobreviver a uma perda de dados (LGPD art. 37);
 *  - view materializada não é exportada — ela é derivada e o `restaurar` a
 *    reconstrói com `REFRESH`;
 *  - o manifesto guarda `sha256` e contagem por tabela: sem isso não existe
 *    teste de restauração de verdade (RNF-027), só a esperança de que o arquivo
 *    esteja íntegro;
 *  - nada de silêncio: se o gzip falhar ou o upload não subir, o erro sobe e o
 *    alerta dispara.
 */

const LOTE_CURSOR = 500;
const LIMITE_TABELA_BYTES = 512 * 1024 * 1024;

export interface OpcoesBackup {
  destino: DestinoBackup;
  retencaoDias?: number;
  cliente?: Sql;
  agora?: Date;
  aoProgresso?: (mensagem: string) => void;
}

function serializarLinha(linha: Record<string, unknown>): string {
  return JSON.stringify(linha, (_chave, valor: unknown) => {
    if (typeof valor === "bigint") return valor.toString();
    // bytea vira o literal hexadecimal que o Postgres entende na volta.
    if (valor instanceof Uint8Array)
      return `\\x${Buffer.from(valor).toString("hex")}`;
    return valor;
  });
}

export async function listarTabelasBase(cliente: Sql): Promise<string[]> {
  const linhas = await cliente.unsafe<{ tabela: string }[]>(
    `select c.relname as tabela
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relispartition
      order by 1`,
  );
  return linhas.map((linha) => linha.tabela);
}

async function contarMigracoes(cliente: Sql): Promise<number | null> {
  try {
    const linhas = await cliente.unsafe<{ total: number }[]>(
      "select count(*)::int as total from drizzle.__drizzle_migrations",
    );
    return linhas[0]?.total ?? 0;
  } catch {
    return null; // banco sem a tabela de controle do Drizzle
  }
}

interface Exportacao {
  bytes: Buffer;
  linhas: number;
}

/** Exporta uma tabela para NDJSON comprimido, sem carregar tudo em memória. */
async function exportarTabela(
  cliente: Sql,
  tabela: string,
): Promise<Exportacao> {
  const pedacos: Buffer[] = [];
  const gzip = createGzip({ level: 9 });
  gzip.on("data", (pedaco: Buffer) => pedacos.push(pedaco));
  const terminou = new Promise<void>((resolver, rejeitar) => {
    gzip.on("end", () => resolver());
    gzip.on("error", rejeitar);
  });

  let linhas = 0;
  const cursor = cliente
    .unsafe(`select * from "${tabela}"`)
    .cursor(LOTE_CURSOR);

  for await (const lote of cursor) {
    for (const linha of lote as Record<string, unknown>[]) {
      linhas += 1;
      if (!gzip.write(serializarLinha(linha) + "\n")) {
        await once(gzip, "drain");
      }
    }
  }

  gzip.end();
  await terminou;

  const bytes = Buffer.concat(pedacos);
  if (bytes.length > LIMITE_TABELA_BYTES) {
    throw new Error(
      `Tabela "${tabela}" gerou ${bytes.length} bytes comprimidos, acima do limite de ${LIMITE_TABELA_BYTES}. Divida o backup antes de continuar.`,
    );
  }

  return { bytes, linhas };
}

function descreverServidor(): { host: string; banco: string } {
  try {
    const url = new URL(env.DATABASE_URL);
    return {
      host: url.hostname,
      banco: url.pathname.replace(/^\//, ""),
    };
  } catch {
    return { host: "desconhecido", banco: "desconhecido" };
  }
}

export async function executarBackup(
  opcoes: OpcoesBackup,
): Promise<ResultadoBackup> {
  const inicio = Date.now();
  const cliente = opcoes.cliente ?? sqlBruto;
  const agora = opcoes.agora ?? new Date();
  const data = agora.toISOString().slice(0, 10);
  const progresso = opcoes.aoProgresso ?? (() => {});

  const tabelas = await listarTabelasBase(cliente);
  if (tabelas.length === 0) {
    throw new Error(
      "Nenhuma tabela encontrada em public: banco vazio ou DATABASE_URL errada.",
    );
  }

  const retencaoDias =
    opcoes.retencaoDias ??
    (await obterConfiguracaoNumero("backup_retencao_dias"));

  progresso(`iniciando backup de ${tabelas.length} tabelas (${data})`);

  const exportadas: TabelaBackup[] = [];

  for (const tabela of tabelas) {
    const { bytes, linhas } = await exportarTabela(cliente, tabela);
    const chave = `${prefixoDoDia(data)}tabelas/${tabela}.ndjson.gz`;

    await opcoes.destino.enviar({
      chave,
      conteudo: bytes,
      contentType: "application/gzip",
    });

    exportadas.push({
      nome: tabela,
      linhas,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      arquivo: chave,
    });

    progresso(`${tabela}: ${linhas} linhas, ${bytes.length} bytes`);
  }

  const manifesto: ManifestoBackup = {
    versao: VERSAO_FORMATO_BACKUP,
    geradoEm: agora.toISOString(),
    data,
    servidor: descreverServidor(),
    migracoesAplicadas: await contarMigracoes(cliente),
    tabelas: exportadas,
    totais: {
      tabelas: exportadas.length,
      linhas: exportadas.reduce((soma, t) => soma + t.linhas, 0),
      bytes: exportadas.reduce((soma, t) => soma + t.bytes, 0),
    },
  };

  const conteudoManifesto = Buffer.from(
    JSON.stringify(manifesto, null, 2),
    "utf8",
  );

  await opcoes.destino.enviar({
    chave: `${prefixoDoDia(data)}manifesto.json`,
    conteudo: conteudoManifesto,
    contentType: "application/json",
  });

  const removidos = await aplicarRetencao(opcoes.destino, retencaoDias, agora);

  progresso(
    `backup concluído: ${manifesto.totais.linhas} linhas em ${manifesto.totais.tabelas} tabelas; ${removidos.length} arquivo(s) expirado(s)`,
  );

  return {
    data,
    destino: opcoes.destino.descricao,
    tabelas: manifesto.totais.tabelas,
    linhas: manifesto.totais.linhas,
    bytes: manifesto.totais.bytes,
    manifesto,
    removidos,
    duracaoMs: Date.now() - inicio,
  };
}
