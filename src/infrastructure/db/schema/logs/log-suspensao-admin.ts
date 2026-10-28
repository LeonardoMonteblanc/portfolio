// src/infrastructure/db/schema/logs/log-suspensao-admin.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logSuspensaoAdmin = pgTable("log_suspensao_admin", {
  ...camposComunsLog,
  adminAlvoId: uuid("admin_alvo_id").notNull(),
  acao: varchar("acao", { length: 20 }).notNull(), // 'suspender' | 'reativar'
  motivo: text("motivo").notNull(),
  ate: timestamp("ate", { withTimezone: true }),
});

export type LogSuspensaoAdmin = typeof logSuspensaoAdmin.$inferSelect;
export type NovoLogSuspensaoAdmin = typeof logSuspensaoAdmin.$inferInsert;
