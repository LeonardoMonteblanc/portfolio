// src/infrastructure/db/schema/logs/log-configuracao.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logConfiguracao = pgTable("log_configuracao", {
  ...camposComunsLog,
  chave: varchar("chave", { length: 80 }).notNull(),
  valorAntes: text("valor_antes"),
  valorDepois: text("valor_depois"),
});

export type LogConfiguracao = typeof logConfiguracao.$inferSelect;
export type NovoLogConfiguracao = typeof logConfiguracao.$inferInsert;
