// src/infrastructure/db/schema/contestacao.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { administrador } from "./administrador";
import { negocio } from "./negocio";
import { solicitacao } from "./solicitacao";
import { votacao } from "./votacao";

export const contestacao = pgTable("contestacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  negocioId: uuid("negocio_id")
    .notNull()
    .references(() => negocio.id),
  solicitacaoOrigemId: uuid("solicitacao_origem_id").references(
    () => solicitacao.id,
  ),
  autorId: uuid("autor_id")
    .notNull()
    .references(() => administrador.id),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'oficial' | 'manifesta'
  fundamentacao: text("fundamentacao").notNull(),
  situacao: varchar("situacao", { length: 20 }).notNull().default("aberta"), // 'aberta' | 'em_votacao' | 'encerrada'
  votacaoId: uuid("votacao_id"),
  decididaEm: timestamp("decidida_em", { withTimezone: true }),
  criadaEm: timestamp("criada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  atualizadaEm: timestamp("atualizada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contestacaoRelations = relations(contestacao, ({ one }) => ({
  negocio: one(negocio, {
    fields: [contestacao.negocioId],
    references: [negocio.id],
  }),
  solicitacaoOrigem: one(solicitacao, {
    fields: [contestacao.solicitacaoOrigemId],
    references: [solicitacao.id],
  }),
  autor: one(administrador, {
    fields: [contestacao.autorId],
    references: [administrador.id],
  }),
  votacao: one(votacao, {
    fields: [contestacao.votacaoId],
    references: [votacao.id],
  }),
}));

export type Contestacao = typeof contestacao.$inferSelect;
export type NovaContestacao = typeof contestacao.$inferInsert;
