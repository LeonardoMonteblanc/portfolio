// src/infrastructure/db/schema/logs/log-comunicacao.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logComunicacao = pgTable("log_comunicacao", {
  ...camposComunsLog,
  tipo: varchar("tipo", { length: 50 }).notNull(),
  destinatario: varchar("destinatario", { length: 255 }).notNull(),
  sucesso: boolean("sucesso").notNull(),
  erro: text("erro"),
});

export type LogComunicacao = typeof logComunicacao.$inferSelect;
export type NovoLogComunicacao = typeof logComunicacao.$inferInsert;
