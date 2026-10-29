// src/infrastructure/db/schema/logs/log-imagem.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logImagem = pgTable("log_imagem", {
  ...camposComunsLog,
  imagemId: uuid("imagem_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(), // 'enviar' | 'aprovar' | 'rejeitar' | 'promover'
  situacaoAnterior: varchar("situacao_anterior", { length: 20 }),
  situacaoNova: varchar("situacao_nova", { length: 20 }),
  justificativa: text("justificativa"),
});

export type LogImagem = typeof logImagem.$inferSelect;
export type NovoLogImagem = typeof logImagem.$inferInsert;
