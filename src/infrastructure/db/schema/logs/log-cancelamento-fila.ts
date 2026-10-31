// src/infrastructure/db/schema/logs/log-cancelamento-fila.ts
import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

/**
 * LogCancelamentoFila — cancelamento da fila de contestação (ME-01 #11).
 * Tabela append-only prevista no Modelo de Dados § 4.2 / backlog F6-02.
 * Regularizada na migration 0015.
 */
export const logCancelamentoFila = pgTable("log_cancelamento_fila", {
  ...camposComunsLog,
  solicitacaoId: uuid("solicitacao_id").notNull(),
  motivo: text("motivo"),
});

export type LogCancelamentoFila = typeof logCancelamentoFila.$inferSelect;
