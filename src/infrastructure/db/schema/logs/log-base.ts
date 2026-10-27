// src/infrastructure/db/schema/logs/log-base.ts
import { uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const camposComunsLog = {
  id: uuid("id").primaryKey().defaultRandom(),
  atorTipo: varchar("ator_tipo", { length: 20 }).notNull(),
  atorId: uuid("ator_id"),
  ipOrigem: varchar("ip_origem", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  requestId: uuid("request_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
};
