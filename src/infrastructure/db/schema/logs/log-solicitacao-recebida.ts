// src/infrastructure/db/schema/logs/log-solicitacao-recebida.ts
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logSolicitacaoRecebida = pgTable("log_solicitacao_recebida", {
  ...camposComunsLog,
  solicitacaoId: uuid("solicitacao_id").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'inclusao' | 'atualizacao'
});

export type LogSolicitacaoRecebida = typeof logSolicitacaoRecebida.$inferSelect;
export type NovoLogSolicitacaoRecebida =
  typeof logSolicitacaoRecebida.$inferInsert;
