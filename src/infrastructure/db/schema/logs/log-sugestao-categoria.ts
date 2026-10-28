// src/infrastructure/db/schema/logs/log-sugestao-categoria.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logSugestaoCategoria = pgTable("log_sugestao_categoria", {
  ...camposComunsLog,
  sugestaoId: uuid("sugestao_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(), // 'aceitar' | 'rejeitar'
  categoriaCriadaId: uuid("categoria_criada_id"),
});

export type LogSugestaoCategoria = typeof logSugestaoCategoria.$inferSelect;
export type NovoLogSugestaoCategoria = typeof logSugestaoCategoria.$inferInsert;
