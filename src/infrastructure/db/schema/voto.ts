// src/infrastructure/db/schema/voto.ts
import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
    escolha: varchar("escolha", { length: 20 }).notNull(), // 'aprovacao' | 'rejeicao'
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueVoto: unique("unique_voto").on(table.votacaoId, table.adminId),
  }),
);

export const votoRelations = relations(voto, ({ one }) => ({
  votacao: one(votacao, {
    fields: [voto.votacaoId],
    references: [votacao.id],
  }),
  autor: one(administrador, {
    fields: [voto.adminId],
    references: [administrador.id],
  }),
}));

export type Voto = typeof voto.$inferSelect;
export type NovoVoto = typeof voto.$inferInsert;
