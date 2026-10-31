// src/infrastructure/audit/audit.service.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { db } from "@/infrastructure/db/client";
import * as schema from "@/infrastructure/db/schema";
import { logAuditoria } from "@/infrastructure/db/schema/logs";

/** Aceita o client padrão ou a transação em curso. */
type Executor = Pick<PostgresJsDatabase<typeof schema>, "insert">;

export interface AuditLogInput {
  atorTipo: "admin" | "solicitante" | "sistema" | "desenvolvedor";
  /** `null` = sistema/cron (sem ator humano). */
  atorId?: string | null;
  ipOrigem?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  acao: string;
  entidadeTipo: string;
  entidadeId?: string | null;
  detalhes: Record<string, unknown>;
  snapshotAntes?: Record<string, unknown> | null;
  snapshotDepois?: Record<string, unknown> | null;
}

/**
 * Insere log de auditoria na tabela unificada log_auditoria.
 * Deve ser chamado dentro da mesma transação da mutação de domínio.
 */
export async function appendLog(
  input: AuditLogInput,
  executor: Executor = db,
): Promise<void> {
  await executor.insert(logAuditoria).values({
    atorTipo: input.atorTipo,
    atorId: input.atorId ?? null,
    ipOrigem: input.ipOrigem ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    acao: input.acao,
    entidadeTipo: input.entidadeTipo,
    entidadeId: input.entidadeId ?? null,
    detalhes: input.detalhes,
    snapshotAntes: input.snapshotAntes ?? null,
    snapshotDepois: input.snapshotDepois ?? null,
  });
}

/**
 * Helper para criar snapshot de entidade para logs de edição
 */
export function criarSnapshot(
  entidade: Record<string, unknown>,
  campos?: string[],
): Record<string, unknown> {
  if (!campos) return { ...entidade };
  const snapshot: Record<string, unknown> = {};
  for (const campo of campos) {
    if (campo in entidade) {
      snapshot[campo] = entidade[campo];
    }
  }
  return snapshot;
}
