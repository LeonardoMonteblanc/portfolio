// src/infrastructure/db/schema/contato.ts
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { negocio } from "./negocio";

export const contato = pgTable("contato", {
  id: uuid("id").primaryKey().defaultRandom(),
  negocioId: uuid("negocio_id")
    .notNull()
    .references(() => negocio.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  valor: varchar("valor", { length: 255 }).notNull(),
  ordem: integer("ordem").notNull().default(0),
  valido: boolean("valido").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Contato = typeof contato.$inferSelect;
export type NovoContato = typeof contato.$inferInsert;
