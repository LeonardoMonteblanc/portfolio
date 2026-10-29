// src/infrastructure/db/schema/categoria.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const categoria = pgTable("categoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Categoria = typeof categoria.$inferSelect;
export type NovaCategoria = typeof categoria.$inferInsert;
