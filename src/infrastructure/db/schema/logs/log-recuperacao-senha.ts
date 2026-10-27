// src/infrastructure/db/schema/logs/log-recuperacao-senha.ts
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logRecuperacaoSenha = pgTable("log_recuperacao_senha", {
  ...camposComunsLog,
  adminId: uuid("admin_id"),
  etapa: varchar("etapa", { length: 20 }).notNull(), // 'solicitacao' | 'redefinicao'
});

export type LogRecuperacaoSenha = typeof logRecuperacaoSenha.$inferSelect;
export type NovoLogRecuperacaoSenha = typeof logRecuperacaoSenha.$inferInsert;
