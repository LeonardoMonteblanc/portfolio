// src/infrastructure/db/schema/health-check.ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: varchar("status", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type HealthCheck = typeof healthCheck.$inferSelect;
export type NovoHealthCheck = typeof healthCheck.$inferInsert;
