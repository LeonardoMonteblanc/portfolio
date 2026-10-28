// src/infrastructure/db/schema/logs/log-solicitacao-analisada.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logSolicitacaoAnalisada = pgTable("log_solicitacao_analisada", {
  ...camposComunsLog,
  solicitacaoId: uuid("solicitacao_id").notNull(),
  decisao: varchar("decisao", { length: 20 }).notNull(), // 'aprovar' | 'reprovar' | 'solicitar_correcao'
  justificativa: text("justificativa"),
  negocioId: uuid("negocio_id"),
});

export type LogSolicitacaoAnalisada =
  typeof logSolicitacaoAnalisada.$inferSelect;
export type NovoLogSolicitacaoAnalisada =
  typeof logSolicitacaoAnalisada.$inferInsert;
