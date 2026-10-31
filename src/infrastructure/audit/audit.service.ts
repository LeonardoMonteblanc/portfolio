// src/infrastructure/audit/audit.service.ts
import { db } from "@/infrastructure/db/client";
import { logAuditoria } from "@/infrastructure/db/schema/logs";

export interface AuditLogInput {
  atorTipo: "admin" | "solicitante" | "sistema" | "desenvolvedor";
  atorId?: string;
  ipOrigem?: string;
  userAgent?: string;
  requestId?: string;
  acao: string;
  entidadeTipo: string;
  entidadeId?: string;
  detalhes: Record<string, unknown>;
  snapshotAntes?: Record<string, unknown>;
  snapshotDepois?: Record<string, unknown>;
}

/**
 * Insere log de auditoria na tabela unificada log_auditoria.
 * Deve ser chamado dentro da mesma transação da mutação de domínio.
 */
export async function appendLog(input: AuditLogInput): Promise<void> {
  await db.insert(logAuditoria).values({
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
