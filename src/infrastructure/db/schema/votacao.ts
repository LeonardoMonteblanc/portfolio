// src/infrastructure/db/schema/votacao.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contestacao } from "./contestacao";
import { voto } from "./voto";

export const votacao = pgTable("votacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  contestacaoId: uuid("contestacao_id")
    .notNull()
    .references(() => contestacao.id),
  pergunta: text("pergunta").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'simples' | 'qualificada'
  quorumMinimo: integer("quorum_minimo").notNull(),
  maioriaNecessaria: integer("maioria_necessaria").notNull(), // percentual (ex: 50, 60, 67)
  situacao: varchar("situacao", { length: 20 })
    .notNull()
    .default("em_andamento"), // 'em_andamento' | 'aprovada' | 'rejeitada' | 'sem_aprovacao'
  iniciadaEm: timestamp("iniciada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  encerraEm: timestamp("encerra_em", { withTimezone: true }).notNull(),
  encerradaEm: timestamp("encerrada_em", { withTimezone: true }),
  resultado: varchar("resultado", { length: 20 }), // 'aprovada' | 'rejeitada' | 'sem_aprovacao'
  totalVotos: integer("total_votos").notNull().default(0),
  votosSim: integer("votos_sim").notNull().default(0),
  votosNao: integer("votos_nao").notNull().default(0),
  votosAbstencao: integer("votos_abstencao").notNull().default(0),
});

export const votacaoRelations = relations(votacao, ({ one, many }) => ({
  contestacao: one(contestacao, {
    fields: [votacao.contestacaoId],
    references: [contestacao.id],
  }),
  votos: many(voto),
}));

export type Votacao = typeof votacao.$inferSelect;
export type NovaVotacao = typeof votacao.$inferInsert;
