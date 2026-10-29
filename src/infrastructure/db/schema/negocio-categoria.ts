// src/infrastructure/db/schema/negocio-categoria.ts
import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { negocio } from "./negocio";
import { categoria } from "./categoria";

export const negocioCategoria = pgTable(
  "negocio_categoria",
  {
    negocioId: uuid("negocio_id")
      .notNull()
      .references(() => negocio.id, { onDelete: "cascade" }),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categoria.id, { onDelete: "cascade" }),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.negocioId, table.categoriaId] }),
  }),
);

export type NegocioCategoria = typeof negocioCategoria.$inferSelect;
export type NovoNegocioCategoria = typeof negocioCategoria.$inferInsert;
