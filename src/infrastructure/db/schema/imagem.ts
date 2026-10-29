// src/infrastructure/db/schema/imagem.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { negocio } from "./negocio";
import { solicitacao } from "./solicitacao";
import { anexo } from "./anexo";

export const imagem = pgTable("imagem", {
  id: uuid("id").primaryKey().defaultRandom(),
  negocioId: uuid("negocio_id")
    .notNull()
    .references(() => negocio.id),
  solicitacaoId: uuid("solicitacao_id").references(() => solicitacao.id),
  anexoOrigemId: uuid("anexo_origem_id").references(() => anexo.id),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'logo' | 'foto'
  situacao: varchar("situacao", { length: 20 }).notNull().default("pendente"), // 'pendente' | 'aprovada' | 'rejeitada'
  url: text("url").notNull(),
  justificativaRejeicao: text("justificativa_rejeicao"),
  criadoEm: timestamp("criada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Imagem = typeof imagem.$inferSelect;
export type NovaImagem = typeof imagem.$inferInsert;
