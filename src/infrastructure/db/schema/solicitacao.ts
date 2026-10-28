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
import { solicitante } from "./solicitante";
import { negocio } from "./negocio";

export const solicitacao = pgTable("solicitacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  solicitanteId: uuid("solicitante_id")
    .notNull()
    .references(() => solicitante.id),
  negocioId: uuid("negocio_id").references(() => negocio.id),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'inclusao' | 'atualizacao'
  situacao: varchar("situacao", { length: 40 }).notNull().default("recebida"),
  declaracaoVinculo: text("declaracao_vinculo").notNull(),
  dadosNegocioProposto: jsonb("dados_negocio_proposto").notNull(),
  duplicataDetectada: boolean("duplicata_detectada").notNull().default(false),
  motivoIncompleta: text("motivo_incompleta"),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Solicitacao = typeof solicitacao.$inferSelect;
export type NovaSolicitacao = typeof solicitacao.$inferInsert;
