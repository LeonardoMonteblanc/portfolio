// src/infrastructure/db/schema/voto.ts
import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { votacao } from "./votacao";
import { administrador } from "./administrador";

export const voto = pgTable(
  "voto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    votacaoId: uuid("votacao_id")
      .notNull()
      .references(() => votacao.id),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => administrador.id),
    valor: varchar("valor", { length: 10 }).notNull(), // 'sim' | 'nao' | 'abstencao'
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueVoto: unique("unique_voto").on(table.votacaoId, table.adminId),
  }),
);

export type Voto = typeof voto.$inferSelect;
export type NovoVoto = typeof voto.$inferInsert;
