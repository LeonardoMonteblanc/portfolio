// src/infrastructure/db/schema/jobs.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const job = pgTable("job", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // 'processar_imagem' | 'processar_anexo' | 'promover_anexo'
  status: varchar("status", { length: 20 }).notNull().default("pendente"), // 'pendente' | 'processando' | 'concluido' | 'falhou'
  payload: jsonb("payload").notNull(), // { anexoId, imagemId, acao, ... }
  resultado: jsonb("resultado"),
  erro: text("erro"),
  tentativas: integer("tentativas").notNull().default(0),
  maxTentativas: integer("max_tentativas").notNull().default(3),
  agendadoPara: timestamp("agendado_para", { withTimezone: true })
    .notNull()
    .defaultNow(),
  iniciadoEm: timestamp("iniciado_em", { withTimezone: true }),
  concluidoEm: timestamp("concluido_em", { withTimezone: true }),
});

export type Job = typeof job.$inferSelect;
export type NovoJob = typeof job.$inferInsert;
