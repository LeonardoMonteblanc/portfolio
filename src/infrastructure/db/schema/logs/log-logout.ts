// src/infrastructure/db/schema/logs/log-logout.ts
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logLogout = pgTable("log_logout", {
  ...camposComunsLog,
  adminId: uuid("admin_id").notNull(),
});

export type LogLogout = typeof logLogout.$inferSelect;
export type NovoLogLogout = typeof logLogout.$inferInsert;
