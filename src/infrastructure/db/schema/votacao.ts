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
import { contestacao } from "./contestacao";

export const votacao = pgTable("votacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  contestacaoId: uuid("contestacao_id")
    .notNull()
    .references(() => contestacao.id),
  pergunta: text("pergunta").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'simples' | 'qualificada'
  quorumMinimo: integer("quorum_minimo").notNull(),
  maioriaNecessaria: integer("maioria_necessaria").notNull(), // percentual (ex: 50, 60, 67)
  situacao: varchar("situacao", { length: 20 }).notNull().default("aberta"), // 'aberta' | 'encerrada' | 'cancelada'
  iniciadaEm: timestamp("iniciada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  encerraEm: timestamp("encerra_em", { withTimezone: true }).notNull(),
  encerradaEm: timestamp("encerrada_em", { withTimezone: true }),
  resultado: varchar("resultado", { length: 20 }), // 'aprovada' | 'reprovada' | 'empate'
  totalVotos: integer("total_votos").notNull().default(0),
  votosSim: integer("votos_sim").notNull().default(0),
  votosNao: integer("votos_nao").notNull().default(0),
  votosAbstencao: integer("votos_abstencao").notNull().default(0),
});

export type Votacao = typeof votacao.$inferSelect;
export type NovaVotacao = typeof votacao.$inferInsert;
