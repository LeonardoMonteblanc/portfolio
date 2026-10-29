// src/infrastructure/db/schema/logs/log-contestacao.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logContestacao = pgTable("log_contestacao", {
  ...camposComunsLog,
  contestacaoId: uuid("contestacao_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(), // 'criar' | 'atualizar' | 'encerrar' | 'iniciar_votacao'
  situacaoAnterior: varchar("situacao_anterior", { length: 20 }),
  situacaoNova: varchar("situacao_nova", { length: 20 }),
});

export type LogContestacao = typeof logContestacao.$inferSelect;
export type NovoLogContestacao = typeof logContestacao.$inferInsert;
