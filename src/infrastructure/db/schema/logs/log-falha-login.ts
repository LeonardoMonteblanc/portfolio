// src/infrastructure/db/schema/logs/log-falha-login.ts
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logFalhaLogin = pgTable("log_falha_login", {
  ...camposComunsLog,
  adminId: uuid("admin_id"),
  emailTentado: varchar("email_tentado", { length: 120 }).notNull(),
  motivo: varchar("motivo", { length: 100 }).notNull(),
});

export type LogFalhaLogin = typeof logFalhaLogin.$inferSelect;
export type NovoLogFalhaLogin = typeof logFalhaLogin.$inferInsert;
