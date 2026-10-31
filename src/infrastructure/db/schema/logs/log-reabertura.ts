// src/infrastructure/db/schema/logs/log-reabertura.ts
import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

/**
 * LogReabertura — reabertura de solicitação por erro do admin (RF-073).
 * Tabela append-only prevista no Modelo de Dados § 4.2 / backlog F6-02.
 * Regularizada na migration 0015.
 */
export const logReabertura = pgTable("log_reabertura", {
  ...camposComunsLog,
  solicitacaoId: uuid("solicitacao_id").notNull(),
  decisaoOriginalId: uuid("decisao_original_id").notNull(),
  justificativa: text("justificativa"),
});

export type LogReabertura = typeof logReabertura.$inferSelect;
