// src/infrastructure/db/schema/logs/log-forum.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logForum = pgTable("log_forum", {
  ...camposComunsLog,
  publicacaoId: uuid("publicacao_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(), // 'criar' | 'editar' | 'excluir'
  conteudoAnterior: text("conteudo_anterior"),
  conteudoNovo: text("conteudo_novo"),
});

export type LogForum = typeof logForum.$inferSelect;
export type NovoLogForum = typeof logForum.$inferInsert;
