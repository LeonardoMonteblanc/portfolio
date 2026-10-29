// src/infrastructure/db/schema/logs/log-anexo.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logAnexo = pgTable("log_anexo", {
  ...camposComunsLog,
  anexoId: uuid("anexo_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(), // 'enviar' | 'iniciar_verificacao' | 'disponibilizar' | 'rejeitar' | 'promover_a_imagem'
  situacaoAnterior: varchar("situacao_anterior", { length: 20 }),
  situacaoNova: varchar("situacao_nova", { length: 20 }),
});

export type LogAnexo = typeof logAnexo.$inferSelect;
export type NovoLogAnexo = typeof logAnexo.$inferInsert;
