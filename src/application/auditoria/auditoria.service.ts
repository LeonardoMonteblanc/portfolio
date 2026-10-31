// src/application/auditoria/auditoria.service.ts
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";

/**
 * RF-063 / F9-05 — consulta da auditoria consolidada.
 *
 * A `vw_auditoria_consolidada` (materializada) reúne as 24 tabelas de log em um
 * formato único: quem (ator), o quê (acao), em qual entidade e quando.
 * O refresh é disparado por `/api/auditoria/refresh` (cron com CRON_SECRET) no
 * intervalo de `refresh_view_auditoria_min` minutos.
 */

export interface RegistroAuditoria {
  criadoEm: Date;
  origem: string;
  registroId: string;
  atorTipo: string;
  atorId: string | null;
  requestId: string | null;
  ipOrigem: string | null;
  userAgent: string | null;
  acao: string | null;
  entidadeTipo: string | null;
  entidadeId: string | null;
  detalhes: Record<string, unknown> | null;
}

export interface FiltroAuditoria {
  atorId?: string;
  acao?: string;
  entidadeTipo?: string;
  entidadeId?: string;
  origem?: string;
  desde?: Date;
  ate?: Date;
  limite?: number;
  deslocamento?: number;
}

export interface ResultadoConsultaAuditoria {
  registros: RegistroAuditoria[];
  total: number;
}

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

function montarCondicoes(filtro: FiltroAuditoria) {
  const condicoes = [];

  if (filtro.atorId) condicoes.push(sql`ator_id = ${filtro.atorId}`);
  if (filtro.acao) condicoes.push(sql`acao = ${filtro.acao}`);
  if (filtro.entidadeTipo)
    condicoes.push(sql`entidade_tipo = ${filtro.entidadeTipo}`);
  if (filtro.entidadeId)
    condicoes.push(sql`entidade_id = ${filtro.entidadeId}`);
  if (filtro.origem) condicoes.push(sql`origem = ${filtro.origem}`);
  if (filtro.desde) condicoes.push(gte(sql`criado_em`, filtro.desde));
  if (filtro.ate) condicoes.push(lte(sql`criado_em`, filtro.ate));

  return condicoes;
}

/** Consulta paginada, do evento mais recente para o mais antigo. */
export async function consultarAuditoria(
  filtro: FiltroAuditoria = {},
): Promise<ResultadoConsultaAuditoria> {
  const condicoes = montarCondicoes(filtro);
  const limite = Math.min(filtro.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);
  const deslocamento = Math.max(filtro.deslocamento ?? 0, 0);

  const where = condicoes.length > 0 ? and(...condicoes) : undefined;

  const registros = await db
    .select({
      criadoEm: sql<Date>`criado_em`,
      origem: sql<string>`origem`,
      registroId: sql<string>`registro_id::text`,
      atorTipo: sql<string>`ator_tipo`,
      atorId: sql<string | null>`ator_id::text`,
      requestId: sql<string | null>`request_id::text`,
      ipOrigem: sql<string | null>`ip_origem`,
      userAgent: sql<string | null>`user_agent`,
      acao: sql<string | null>`acao`,
      entidadeTipo: sql<string | null>`entidade_tipo`,
      entidadeId: sql<string | null>`entidade_id::text`,
      detalhes: sql<Record<string, unknown> | null>`detalhes`,
    })
    .from(sql`vw_auditoria_consolidada`)
    .where(where)
    .orderBy(desc(sql`criado_em`))
    .limit(limite)
    .offset(deslocamento);

  const totalResult = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(sql`vw_auditoria_consolidada`)
    .where(where);

  // O driver devolve timestamptz como string em algumas configurações;
  // normalizamos para Date para o consumidor não precisar saber disso.
  const normalizados: RegistroAuditoria[] = registros.map((registro) => ({
    ...(registro as Omit<RegistroAuditoria, "criadoEm"> & {
      criadoEm: unknown;
    }),
    criadoEm: new Date(registro.criadoEm as unknown as string | Date),
  }));

  return {
    registros: normalizados,
    total: Number(totalResult[0]?.total ?? 0),
  };
}

/**
 * Atualiza a view materializada. Usa CONCURRENTLY para não bloquear leituras
 * (exige o índice único criado na migration 0015).
 */
export async function atualizarViewAuditoria(): Promise<{
  atualizadaEm: Date;
}> {
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY "vw_auditoria_consolidada"`,
  );
  return { atualizadaEm: new Date() };
}
