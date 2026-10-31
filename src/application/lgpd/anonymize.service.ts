// src/application/lgpd/anonymize.service.ts
import { db } from "@/infrastructure/db/client";
import { solicitante } from "@/infrastructure/db/schema/solicitante";
import { solicitacao } from "@/infrastructure/db/schema/solicitacao";
import { logAnonimizacao } from "@/infrastructure/db/schema/logs";
import { MARCADOR_ANONIMIZADO } from "@/domain/utils/anonimizar-campos";
import type { AtorTipo, SituacaoSolicitacao } from "@/domain/enums";
import {
  and,
  eq,
  exists,
  gt,
  isNull,
  notExists,
  notInArray,
} from "drizzle-orm";

/**
 * RF-072 / RNF-021 — direito de exclusão.
 *
 * Regras (docs/02-requisitos/02-RNF.md § RNF-021):
 * - Solicitante.nome, email, telefone -> "<anonimizado>"
 * - Solicitante.anonimizado_em -> timestamp
 * - Solicitacao.dados_negocio_proposto -> PII anonimizada, demais campos preservados
 * - Logs de auditoria PRESERVAM o PII original (base legal: auditoria)
 */

/** Campos de PII do próprio solicitante (modelo de dados § 2.1). */
const CAMPOS_SOLICITANTE = ["nome", "email", "telefone"] as const;

/**
 * Chaves de PII dentro do jsonb dados_negocio_proposto.
 * A comparação é feita por nome de chave, em qualquer profundidade, porque o
 * payload guarda contatos em array e localização em objeto aninhado.
 */
const CHAVES_PII_NEGOCIO = new Set([
  "nome",
  "nomefantasia",
  "nome_fantasia",
  "razaosocial",
  "razao_social",
  "email",
  "telefone",
  "whatsapp",
  "celular",
  "cpf",
  "cnpj",
  "endereco",
  "cep",
  "numero",
  "complemento",
  "instagram",
  "valor",
]);

/**
 * Situações terminais da ME-01. Só elas entram no relógio de retenção:
 * RNF-018 define "2 anos após estado terminal" (não após a criação).
 */
const SITUACOES_TERMINAIS: SituacaoSolicitacao[] = [
  "aprovada",
  "rejeitada",
  "votacao_aprovada",
  "votacao_rejeitada",
  "votacao_sem_aprovacao",
  "cancelada_por_contestacao",
];

export interface ResultadoAnonimizacao {
  success: boolean;
  solicitanteId: string;
  camposAnonimizados: string[];
  solicitacoesAtualizadas: number;
}

interface DadosAnonimizados {
  dados: Record<string, unknown>;
  campos: string[];
}

/**
 * Percorre o jsonb e substitui por MARCADOR_ANONIMIZADO apenas as folhas de PII.
 * Preserva descrição, bairro, horários, categorias e sugestões.
 */
function anonimizarDadosNegocio(dados: unknown): DadosAnonimizados {
  const campos: string[] = [];

  function percorrer(valor: unknown, caminho: string): unknown {
    if (Array.isArray(valor)) {
      return valor.map((item, indice) =>
        percorrer(item, `${caminho}[${indice}]`),
      );
    }

    if (valor && typeof valor === "object") {
      const resultado: Record<string, unknown> = {};
      for (const [chave, filho] of Object.entries(
        valor as Record<string, unknown>,
      )) {
        const caminhoFilho = caminho ? `${caminho}.${chave}` : chave;
        resultado[chave] = percorrer(filho, caminhoFilho);
      }
      return resultado;
    }

    if (typeof valor === "string" && valor.length > 0) {
      const chaveFolha =
        caminho
          .split(".")
          .pop()
          ?.replace(/\[\d+\]/g, "") ?? "";
      if (CHAVES_PII_NEGOCIO.has(chaveFolha.toLowerCase())) {
        campos.push(caminho);
        return MARCADOR_ANONIMIZADO;
      }
    }

    return valor;
  }

  const resultadoDados: Record<string, unknown> =
    dados && typeof dados === "object" && !Array.isArray(dados)
      ? (percorrer(dados, "") as Record<string, unknown>)
      : {};

  return { dados: resultadoDados, campos };
}

/**
 * Anonimiza um solicitante (manual, pelo admin) e os dados propostos das
 * solicitações dele, registrando LogAnonimizacao na mesma transação.
 */
export async function anonimizarSolicitante(
  solicitanteId: string,
  adminId: string | null = null,
  ipOrigem?: string,
  userAgent?: string,
  atorTipo: AtorTipo = adminId ? "admin" : "sistema",
): Promise<ResultadoAnonimizacao> {
  const encontrados = await db
    .select()
    .from(solicitante)
    .where(eq(solicitante.id, solicitanteId))
    .limit(1);

  const alvo = encontrados[0];
  if (!alvo) {
    throw new Error("Solicitante não encontrado");
  }

  if (alvo.anonimizadoEm) {
    return {
      success: true,
      solicitanteId,
      camposAnonimizados: [],
      solicitacoesAtualizadas: 0,
    };
  }

  const solicitacoes = await db
    .select({
      id: solicitacao.id,
      dadosNegocioProposto: solicitacao.dadosNegocioProposto,
    })
    .from(solicitacao)
    .where(eq(solicitacao.solicitanteId, solicitanteId));

  const camposAnonimizados: string[] = CAMPOS_SOLICITANTE.filter((campo) =>
    Boolean(alvo[campo]),
  ).map((campo) => `solicitante.${campo}`);

  const alteracoesNegocio = solicitacoes.map((solicitacaoAtual) => {
    const { dados, campos } = anonimizarDadosNegocio(
      solicitacaoAtual.dadosNegocioProposto,
    );
    return { id: solicitacaoAtual.id, dados, campos };
  });

  for (const alteracao of alteracoesNegocio) {
    camposAnonimizados.push(
      ...alteracao.campos.map(
        (campo) =>
          `solicitacao.${alteracao.id}.dados_negocio_proposto.${campo}`,
      ),
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(solicitante)
      .set({
        nome: MARCADOR_ANONIMIZADO,
        email: MARCADOR_ANONIMIZADO,
        telefone: MARCADOR_ANONIMIZADO,
        anonimizadoEm: new Date(),
      })
      .where(eq(solicitante.id, solicitanteId));

    for (const alteracao of alteracoesNegocio) {
      if (alteracao.campos.length === 0) continue;
      await tx
        .update(solicitacao)
        .set({
          dadosNegocioProposto: alteracao.dados,
          atualizadoEm: new Date(),
        })
        .where(eq(solicitacao.id, alteracao.id));
    }

    await tx.insert(logAnonimizacao).values({
      atorTipo,
      atorId: atorTipo === "admin" ? adminId : null,
      ipOrigem: ipOrigem ?? null,
      userAgent: userAgent ?? null,
      solicitanteId,
      camposAnonimizados,
    });
  });

  return {
    success: true,
    solicitanteId,
    camposAnonimizados,
    solicitacoesAtualizadas: alteracoesNegocio.filter(
      (a) => a.campos.length > 0,
    ).length,
  };
}

export interface ResultadoCronAnonimizacao {
  processados: number;
  anonimizados: number;
  erros: string[];
}

/**
 * F9-08 / RNF-018 — expurgo automático: solicitantes sem atividade há mais de
 * 2 anos e sem solicitação em andamento.
 */
export async function cronAnonimizacaoAutomatica(): Promise<ResultadoCronAnonimizacao> {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 2);

  const candidatos = await db
    .select({ id: solicitante.id })
    .from(solicitante)
    .where(
      and(
        isNull(solicitante.anonimizadoEm),
        // Precisa ter ao menos uma solicitação para haver o que expurgar.
        exists(
          db
            .select({ id: solicitacao.id })
            .from(solicitacao)
            .where(eq(solicitacao.solicitanteId, solicitante.id)),
        ),
        // Nenhuma solicitação fora de estado terminal (fluxo em andamento).
        notExists(
          db
            .select({ id: solicitacao.id })
            .from(solicitacao)
            .where(
              and(
                eq(solicitacao.solicitanteId, solicitante.id),
                notInArray(solicitacao.situacao, SITUACOES_TERMINAIS),
              ),
            ),
        ),
        // Nenhuma solicitação tocada nos últimos 2 anos (contados do estado terminal).
        notExists(
          db
            .select({ id: solicitacao.id })
            .from(solicitacao)
            .where(
              and(
                eq(solicitacao.solicitanteId, solicitante.id),
                gt(solicitacao.atualizadoEm, limite),
              ),
            ),
        ),
      ),
    );

  const resultado: ResultadoCronAnonimizacao = {
    processados: 0,
    anonimizados: 0,
    erros: [],
  };

  for (const candidato of candidatos) {
    resultado.processados += 1;
    try {
      await anonimizarSolicitante(
        candidato.id,
        null,
        undefined,
        undefined,
        "sistema",
      );
      resultado.anonimizados += 1;
    } catch (erro) {
      resultado.erros.push(
        `${candidato.id}: ${erro instanceof Error ? erro.message : "erro desconhecido"}`,
      );
    }
  }

  return resultado;
}
