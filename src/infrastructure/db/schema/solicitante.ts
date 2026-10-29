// src/infrastructure/db/schema/solicitante.ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const solicitante = pgTable("solicitante", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 120 }).notNull(),
  email: varchar("email", { length: 120 }).notNull(),
  telefone: varchar("telefone", { length: 20 }).notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  anonimizadoEm: timestamp("anonimizado_em", { withTimezone: true }),
});

export type Solicitante = typeof solicitante.$inferSelect;
export type NovoSolicitante = typeof solicitante.$inferInsert;
