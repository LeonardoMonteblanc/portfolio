// src/infrastructure/db/schema/logs/log-correcao.ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

/**
 * LogCorrecao — registro de pedido/recebimento de correção de dados (ME-04).
 * Tabela append-only prevista no Modelo de Dados § 4.2 / backlog F6-02.
 * Existia no banco (criada por script ad-hoc), mas não tinha schema Drizzle
 * nem migration; foi regularizada na migration 0015.
 */
export const logCorrecao = pgTable("log_correcao", {
  ...camposComunsLog,
  solicitacaoId: uuid("solicitacao_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(),
  prazoEm: timestamp("prazo_em", { withTimezone: true }),
});

export type LogCorrecao = typeof logCorrecao.$inferSelect;
