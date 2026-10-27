// src/infrastructure/db/schema/logs/log-login.ts
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logLogin = pgTable("log_login", {
  ...camposComunsLog,
  adminId: uuid("admin_id").notNull(),
});

export type LogLogin = typeof logLogin.$inferSelect;
export type NovoLogLogin = typeof logLogin.$inferInsert;
