// src/infrastructure/db/schema/configuracao.ts
import { pgTable, varchar, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { administrador } from "./administrador";

/**
 * Parâmetros operacionais editáveis pelo administrador (Modelo de Dados § 2.19).
 * A chave é a PK: cada linha é um parâmetro; o valor é sempre texto e a
 * conversão (int, lista, e-mail) é responsabilidade de `configuracao.service`.
 */
export const configuracao = pgTable("configuracao", {
  chave: varchar("chave", { length: 80 }).primaryKey(),
  valor: text("valor").notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  atualizadoPor: uuid("atualizado_por")
    .notNull()
    .references(() => administrador.id),
});

export const configuracaoRelations = relations(configuracao, ({ one }) => ({
  autor: one(administrador, {
    fields: [configuracao.atualizadoPor],
    references: [administrador.id],
  }),
}));

export type Configuracao = typeof configuracao.$inferSelect;
export type NovaConfiguracao = typeof configuracao.$inferInsert;
