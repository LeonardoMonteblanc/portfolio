// src/infrastructure/db/schema/forum-publicacao.ts
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
import { contestacao } from "./contestacao";

export const forumPublicacao = pgTable("forum_publicacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  negocioId: uuid("negocio_id")
    .notNull()
    .references(() => negocio.id),
  autorId: uuid("autor_id")
    .notNull()
    .references(() => administrador.id),
  autorTipo: varchar("autor_tipo", { length: 20 }).notNull(), // 'admin' | 'sistema'
  tipo: varchar("tipo", { length: 20 }).notNull().default("comentario"), // 'comentario' | 'concordancia' | 'discordancia'
  conteudo: text("conteudo").notNull(),
  comentarioPaiId: uuid("comentario_pai_id"),
  editada: boolean("editada").notNull().default(false),
  criadaEm: timestamp("criada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  atualizadaEm: timestamp("atualizada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const forumPublicacaoRelations = relations(
  forumPublicacao,
  ({ one, many }) => ({
    negocio: one(negocio, {
      fields: [forumPublicacao.negocioId],
      references: [negocio.id],
    }),
    autor: one(administrador, {
      fields: [forumPublicacao.autorId],
      references: [administrador.id],
    }),
    comentarioPai: one(forumPublicacao, {
      fields: [forumPublicacao.comentarioPaiId],
      references: [forumPublicacao.id],
    }),
    respostas: many(forumPublicacao),
    contestacoes: many(contestacao),
  }),
);

export type ForumPublicacao = typeof forumPublicacao.$inferSelect;
export type NovaForumPublicacao = typeof forumPublicacao.$inferInsert;
