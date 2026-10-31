// src/application/configuracao/configuracao.service.ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { configuracao } from "@/infrastructure/db/schema";
import { logConfiguracao } from "@/infrastructure/db/schema/logs";
import { appendLog } from "@/infrastructure/audit/audit.service";
import { ErroDominio } from "@/domain/errors/domain-error";

/**
 * RF-061 / F9-01 / F9-03 — parâmetros operacionais.
 *
 * A tabela guarda tudo como texto (Modelo de Dados § 2.19). Este módulo é a
 * única porta de entrada: valida o valor por chave, grava o log de evento
 * (`log_configuracao`) e o log de auditoria (`log_auditoria`) na MESMA
 * transação, para que nenhuma alteração fique sem rastro (RF-062/RN25).
 */

/** Chaves previstas no Modelo de Dados § 2.19, com validação e valor padrão. */
export const CONFIGURACOES = {
  prazo_correcao_dias: {
    schema: z.coerce.number().int().min(1).max(30),
    padrao: "7",
    descricao:
      "Prazo, em dias, para o anunciante responder uma correção (ME-04).",
  },
  rate_limit_login_por_min: {
    schema: z.coerce.number().int().min(1).max(1000),
    padrao: "10",
    descricao: "Tentativas de login por minuto e por IP (RF-020).",
  },
  rate_limit_solicitacao_por_hora: {
    schema: z.coerce.number().int().min(1).max(1000),
    padrao: "5",
    descricao: "Envio de solicitações por hora e por IP (RNF-009).",
  },
  tamanho_max_upload_mb: {
    schema: z.coerce.number().int().min(1).max(50),
    padrao: "10",
    descricao: "Tamanho máximo de upload em MB (RNF-015).",
  },
  formatos_imagem_aceitos: {
    schema: z
      .string()
      .regex(/^[a-z0-9]+(,[a-z0-9]+)*$/, "Use extensões separadas por vírgula"),
    padrao: "jpg,png,webp",
    descricao: "Extensões de imagem aceitas no upload.",
  },
  formatos_anexo_aceitos: {
    schema: z
      .string()
      .regex(/^[a-z0-9]+(,[a-z0-9]+)*$/, "Use extensões separadas por vírgula"),
    padrao: "jpg,png,webp,pdf",
    descricao: "Extensões de anexo aceitas na solicitação pública.",
  },
  max_anexos_por_solicitacao: {
    schema: z.coerce.number().int().min(1).max(10),
    padrao: "3",
    descricao: "Quantidade máxima de anexos por solicitação (ME-06).",
  },
  email_admin_institucional: {
    schema: z.string().email(),
    padrao: "contato@guiabg.com.br",
    descricao: "E-mail institucional exibido ao público (RF-070).",
  },
  email_contato_dpo: {
    schema: z.string().email(),
    padrao: "dpo@guiabg.com.br",
    descricao: "Contato do encarregado de dados (LGPD).",
  },
  refresh_view_auditoria_min: {
    schema: z.coerce.number().int().min(1).max(60),
    padrao: "5",
    descricao: "Intervalo de atualização da view de auditoria (RF-063).",
  },
  backup_retencao_dias: {
    schema: z.coerce.number().int().min(7).max(365),
    padrao: "30",
    descricao: "Por quantos dias os backups diários são mantidos (RF-068).",
  },
} as const;

export type ChaveConfiguracao = keyof typeof CONFIGURACOES;

export const CHAVES_CONFIGURACAO = Object.keys(
  CONFIGURACOES,
) as ChaveConfiguracao[];

function ehChaveValida(chave: string): chave is ChaveConfiguracao {
  return Object.prototype.hasOwnProperty.call(CONFIGURACOES, chave);
}

export type MapaConfiguracao = Record<ChaveConfiguracao, string>;

/** Lê todas as configurações, completando o que faltar com os padrões. */
export async function listarConfiguracoes(): Promise<MapaConfiguracao> {
  const linhas = await db.select().from(configuracao);
  const mapa = Object.fromEntries(
    CHAVES_CONFIGURACAO.map((chave) => [chave, CONFIGURACOES[chave].padrao]),
  ) as MapaConfiguracao;

  for (const linha of linhas) {
    if (ehChaveValida(linha.chave)) {
      mapa[linha.chave] = linha.valor;
    }
  }

  return mapa;
}

/** Valor textual de uma chave (cai no padrão quando ainda não foi persistida). */
export async function obterConfiguracao(
  chave: ChaveConfiguracao,
): Promise<string> {
  const linhas = await db
    .select({ valor: configuracao.valor })
    .from(configuracao)
    .where(eq(configuracao.chave, chave))
    .limit(1);

  return linhas[0]?.valor ?? CONFIGURACOES[chave].padrao;
}

/** Valor numérico já convertido (ex.: prazo de correção em dias). */
export async function obterConfiguracaoNumero(
  chave: ChaveConfiguracao,
): Promise<number> {
  const bruto = await obterConfiguracao(chave);
  const numero = Number(bruto);
  return Number.isFinite(numero) ? numero : Number(CONFIGURACOES[chave].padrao);
}

/** Valor em lista (ex.: `jpg,png,webp` → `["jpg","png","webp"]`). */
export async function obterConfiguracaoLista(
  chave: ChaveConfiguracao,
): Promise<string[]> {
  const bruto = await obterConfiguracao(chave);
  return bruto
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface AtualizarConfiguracaoInput {
  chave: string;
  valor: string;
  adminId: string;
  ipOrigem?: string;
  userAgent?: string;
}

export interface ResultadoAtualizacaoConfiguracao {
  chave: ChaveConfiguracao;
  valorAntes: string;
  valorDepois: string;
  alterado: boolean;
}

/**
 * Valida e persiste um parâmetro, registrando log de evento e de auditoria.
 * Idempotente: se o valor não mudou, não grava nada.
 */
export async function atualizarConfiguracao(
  input: AtualizarConfiguracaoInput,
): Promise<ResultadoAtualizacaoConfiguracao> {
  const { chave, adminId } = input;

  if (!ehChaveValida(chave)) {
    throw new ErroDominio(
      "CONFIGURACAO_DESCONHECIDA",
      `Parâmetro desconhecido: ${chave}`,
    );
  }

  const definicao = CONFIGURACOES[chave];
  const validacao = definicao.schema.safeParse(input.valor);

  if (!validacao.success) {
    throw new ErroDominio(
      "CONFIGURACAO_INVALIDA",
      `Valor inválido para ${chave}: ${validacao.error.issues[0]?.message ?? "formato inesperado"}`,
    );
  }

  const valorNovo = String(validacao.data);
  const valorAntes = await obterConfiguracao(chave);

  if (valorAntes === valorNovo) {
    return { chave, valorAntes, valorDepois: valorNovo, alterado: false };
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(configuracao)
      .values({
        chave,
        valor: valorNovo,
        atualizadoPor: adminId,
        atualizadoEm: new Date(),
      })
      .onConflictDoUpdate({
        target: configuracao.chave,
        set: {
          valor: valorNovo,
          atualizadoPor: adminId,
          atualizadoEm: new Date(),
        },
      });

    await tx.insert(logConfiguracao).values({
      atorTipo: "admin",
      atorId: adminId,
      ipOrigem: input.ipOrigem ?? null,
      userAgent: input.userAgent ?? null,
      chave,
      valorAntes,
      valorDepois: valorNovo,
    });

    await appendLog(
      {
        atorTipo: "admin",
        atorId: adminId,
        ipOrigem: input.ipOrigem,
        userAgent: input.userAgent,
        acao: "atualizar_configuracao",
        entidadeTipo: "configuracao",
        detalhes: { chave, valorAntes, valorDepois: valorNovo },
        snapshotAntes: { chave, valor: valorAntes },
        snapshotDepois: { chave, valor: valorNovo },
      },
      tx,
    );
  });

  return { chave, valorAntes, valorDepois: valorNovo, alterado: true };
}

/**
 * Garante que todas as chaves previstas existam com o valor padrão.
 * Usado pelo seed (`pnpm db:seed:config`) e por deploys novos.
 */
export async function garantirConfiguracoesPadrao(
  adminId: string,
): Promise<{ criadas: ChaveConfiguracao[] }> {
  const existentes = await db
    .select({ chave: configuracao.chave })
    .from(configuracao);
  const conjunto = new Set(existentes.map((linha) => linha.chave));
  const criadas: ChaveConfiguracao[] = [];

  for (const chave of CHAVES_CONFIGURACAO) {
    if (conjunto.has(chave)) continue;

    await db
      .insert(configuracao)
      .values({
        chave,
        valor: CONFIGURACOES[chave].padrao,
        atualizadoPor: adminId,
        atualizadoEm: new Date(),
      })
      .onConflictDoNothing();

    criadas.push(chave);
  }

  return { criadas };
}
