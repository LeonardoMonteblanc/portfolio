// src/infrastructure/db/schema/logs/log-anonimizacao.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logAnonimizacao = pgTable("log_anonimizacao", {
  ...camposComunsLog,
  solicitanteId: uuid("solicitante_id").notNull(),
  camposAnonimizados: text("campos_anonimizados").array().notNull(),
});

export type LogAnonimizacao = typeof logAnonimizacao.$inferSelect;
export type NovoLogAnonimizacao = typeof logAnonimizacao.$inferInsert;
