// src/infrastructure/db/schema/negocio.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contato } from "./contato";
import { localizacao } from "./localizacao";
import { horarioFuncionamento } from "./horario-funcionamento";
import { negocioCategoria } from "./negocio-categoria";
import { imagem } from "./imagem";
import { anexo } from "./anexo";
import { solicitacao } from "./solicitacao";

export const negocio = pgTable("negocio", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  nome: varchar("nome", { length: 150 }).notNull(),
  descricao: text("descricao").notNull(),
  situacaoPublicacao: varchar("situacao_publicacao", { length: 30 })
    .notNull()
    .default("nao_elegivel"),
  motivoNaoElegivel: varchar("motivo_nao_elegivel", { length: 30 }),
  aprovacaoVigenteId: uuid("aprovacao_vigente_id"),
  fonte: varchar("fonte", { length: 30 }).default("manual"), // 'manual' | 'solicitacao_publica'
  solicitacaoOrigemId: uuid("solicitacao_origem_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const negocioRelations = relations(negocio, ({ many, one }) => ({
  contatos: many(contato),
  localizacao: one(localizacao),
  horarios: many(horarioFuncionamento),
  categorias: many(negocioCategoria),
  imagens: many(imagem),
  anexos: many(anexo),
  solicitacaoOrigem: one(solicitacao, {
    fields: [negocio.solicitacaoOrigemId],
    references: [solicitacao.id],
  }),
}));

export type Negocio = typeof negocio.$inferSelect;
export type NovoNegocio = typeof negocio.$inferInsert;
