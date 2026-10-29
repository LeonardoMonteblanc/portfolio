// src/infrastructure/db/schema/solicitacao.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { solicitante } from "./solicitante";
import { negocio } from "./negocio";
import { sugestaoCategoria } from "./sugestao-categoria";
import { imagem } from "./imagem";
import { anexo } from "./anexo";

export const solicitacao = pgTable("solicitacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  solicitanteId: uuid("solicitante_id")
    .notNull()
    .references(() => solicitante.id),
  negocioId: uuid("negocio_id").references(() => negocio.id),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'inclusao' | 'atualizacao'
  situacao: varchar("situacao", { length: 40 }).notNull().default("recebida"),
  origemDecisao: varchar("origem_decisao", { length: 20 }), // 'individual' | 'votacao'
  declaracaoVinculo: text("declaracao_vinculo").notNull(),
  dadosNegocioProposto: jsonb("dados_negocio_proposto").notNull(),
  duplicataDetectada: boolean("duplicata_detectada").notNull().default(false),
  motivoIncompleta: text("motivo_incompleta"),
  analisadaEm: timestamp("analisada_em", { withTimezone: true }),
  observacoesInternas: text("observacoes_internas"),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const solicitacaoRelations = relations(solicitacao, ({ one, many }) => ({
  solicitante: one(solicitante, {
    fields: [solicitacao.solicitanteId],
    references: [solicitante.id],
  }),
  negocio: one(negocio, {
    fields: [solicitacao.negocioId],
    references: [negocio.id],
  }),
  categoriasSugeridas: many(sugestaoCategoria),
  imagens: many(imagem),
  anexos: many(anexo),
}));

export type Solicitacao = typeof solicitacao.$inferSelect;
export type NovaSolicitacao = typeof solicitacao.$inferInsert;
