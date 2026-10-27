// src/infrastructure/db/schema/logs/log-rate-limit.ts
import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logRateLimit = pgTable("log_rate_limit", {
  ...camposComunsLog,
  ip: varchar("ip", { length: 45 }).notNull(),
  rota: varchar("rota", { length: 100 }).notNull(),
  limite: integer("limite").notNull(),
});

export type LogRateLimit = typeof logRateLimit.$inferSelect;
export type NovoLogRateLimit = typeof logRateLimit.$inferInsert;
