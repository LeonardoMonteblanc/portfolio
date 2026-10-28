// src/infrastructure/db/schema/logs/log-votacao.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logVotacao = pgTable("log_votacao", {
  ...camposComunsLog,
  votacaoId: uuid("votacao_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(), // 'criar' | 'encerrar' | 'apurar' | 'cancelar'
  situacaoAnterior: varchar("situacao_anterior", { length: 20 }),
  situacaoNova: varchar("situacao_nova", { length: 20 }),
  resultado: varchar("resultado", { length: 20 }),
  totalVotos: integer("total_votos"),
});

export type LogVotacao = typeof logVotacao.$inferSelect;
export type NovoLogVotacao = typeof logVotacao.$inferInsert;
