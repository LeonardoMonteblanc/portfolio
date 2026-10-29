// src/infrastructure/db/schema/anexo.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { solicitacao } from "./solicitacao";
import { imagem } from "./imagem";

export const anexo = pgTable("anexo", {
  id: uuid("id").primaryKey().defaultRandom(),
  solicitacaoId: uuid("solicitacao_id")
    .notNull()
    .references(() => solicitacao.id),
  arquivoUrl: text("arquivo_url").notNull(),
  nomeOriginal: varchar("nome_original", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  tamanhoBytes: integer("tamanho_bytes").notNull(),
  situacao: varchar("situacao", { length: 20 }).notNull().default("recebido"), // 'recebido' | 'em_verificacao' | 'disponivel' | 'rejeitado'
  criadoEm: timestamp("criada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const anexoRelations = relations(anexo, ({ one, many }) => ({
  solicitacao: one(solicitacao, {
    fields: [anexo.solicitacaoId],
    references: [solicitacao.id],
  }),
  imagens: many(imagem),
}));

export type Anexo = typeof anexo.$inferSelect;
export type NovoAnexo = typeof anexo.$inferInsert;
