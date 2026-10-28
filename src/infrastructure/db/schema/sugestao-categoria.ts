// src/infrastructure/db/schema/sugestao-categoria.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { solicitacao } from "./solicitacao";
import { categoria } from "./categoria";

export const sugestaoCategoria = pgTable("sugestao_categoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  solicitacaoId: uuid("solicitacao_id")
    .notNull()
    .references(() => solicitacao.id),
  textoSugerido: varchar("texto_sugerido", { length: 150 }).notNull(),
  situacao: varchar("situacao", { length: 20 }).notNull().default("pendente"), // 'pendente' | 'aceita' | 'rejeitada'
  categoriaCriadaId: uuid("categoria_criada_id").references(() => categoria.id),
  adminId: uuid("admin_id"),
  justificativaInterna: text("justificativa_interna"),
  criadaEm: timestamp("criada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  triadaEm: timestamp("triada_em", { withTimezone: true }),
});

export type SugestaoCategoria = typeof sugestaoCategoria.$inferSelect;
export type NovaSugestaoCategoria = typeof sugestaoCategoria.$inferInsert;
