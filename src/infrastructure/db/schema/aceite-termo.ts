// src/infrastructure/db/schema/aceite-termo.ts
import { pgTable, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { solicitante } from "./solicitante";
import { documentoTermo } from "./documento-termo";

export const aceiteTermo = pgTable("aceite_termo", {
  id: uuid("id").primaryKey().defaultRandom(),
  solicitanteId: uuid("solicitante_id")
    .notNull()
    .references(() => solicitante.id),
  documentoTermoId: uuid("documento_termo_id")
    .notNull()
    .references(() => documentoTermo.id),
  aceitoEm: timestamp("aceito_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipOrigem: varchar("ip_origem", { length: 45 }),
});

export type AceiteTermo = typeof aceiteTermo.$inferSelect;
export type NovoAceiteTermo = typeof aceiteTermo.$inferInsert;
