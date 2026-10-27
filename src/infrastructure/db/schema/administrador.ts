// src/infrastructure/db/schema/administrador.ts
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const administrador = pgTable("administrador", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 120 }).notNull(),
  email: varchar("email", { length: 120 }).notNull().unique(),
  senhaHash: varchar("senha_hash", { length: 255 }).notNull(),
  tokenVersion: integer("token_version").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ultimaTrocaSenha: timestamp("ultima_troca_senha", { withTimezone: true }),
});

export type Administrador = typeof administrador.$inferSelect;
export type NovoAdministrador = typeof administrador.$inferInsert;
