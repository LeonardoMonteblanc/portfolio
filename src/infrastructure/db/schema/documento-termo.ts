// src/infrastructure/db/schema/documento-termo.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const documentoTermo = pgTable("documento_termo", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // 'termos_uso' | 'politica_privacidade' | 'tratamento_dados'
  versao: varchar("versao", { length: 20 }).notNull(),
  conteudo: text("conteudo").notNull(),
  publicadoEm: timestamp("publicado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  vigente: boolean("vigente").notNull().default(true),
});

export type DocumentoTermo = typeof documentoTermo.$inferSelect;
export type NovoDocumentoTermo = typeof documentoTermo.$inferInsert;
