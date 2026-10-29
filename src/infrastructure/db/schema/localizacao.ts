// src/infrastructure/db/schema/localizacao.ts
import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { negocio } from "./negocio";

export const localizacao = pgTable("localizacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  negocioId: uuid("negocio_id")
    .notNull()
    .unique()
    .references(() => negocio.id, { onDelete: "cascade" }),
  endereco: text("endereco"),
  bairro: varchar("bairro", { length: 80 }),
  areaAtendimento: text("area_atendimento"),
});

export type Localizacao = typeof localizacao.$inferSelect;
export type NovaLocalizacao = typeof localizacao.$inferInsert;
