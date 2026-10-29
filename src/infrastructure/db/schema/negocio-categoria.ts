// src/infrastructure/db/schema/negocio-categoria.ts
import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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

export const negocioCategoriaRelations = relations(
  negocioCategoria,
  ({ one }) => ({
    negocio: one(negocio, {
      fields: [negocioCategoria.negocioId],
      references: [negocio.id],
    }),
    categoria: one(categoria, {
      fields: [negocioCategoria.categoriaId],
      references: [categoria.id],
    }),
  }),
);

export type NegocioCategoria = typeof negocioCategoria.$inferSelect;
export type NovoNegocioCategoria = typeof negocioCategoria.$inferInsert;
