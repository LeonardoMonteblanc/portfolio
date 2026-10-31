// src/infrastructure/db/schema/logs/log-alerta.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Registro de alertas operacionais (RF-068 / RNF-031 / F9-11).
 *
 * Fica fora de `vw_auditoria_consolidada` de propósito: a view é o índice de
 * auditoria de dados pessoais (quem fez o quê em qual registro). Alerta é
 * telemetria do sistema — misturar os dois polui a consulta de auditoria e
 * muda o significado dela para quem fiscaliza a LGPD.
 *
 * `canais` guarda o resultado de cada canal separadamente porque alerta que
 * "falhou" sem dizer qual canal caiu é inútil: o plantonista precisa saber se
 * o e-mail saiu e o webhook não.
 */
export const logAlerta = pgTable(
  "log_alerta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: varchar("tipo", { length: 60 }).notNull(),
    severidade: varchar("severidade", { length: 20 }).notNull(),
    mensagem: text("mensagem").notNull(),
    contexto: jsonb("contexto"),
    canais: jsonb("canais"),
    entregue: boolean("entregue").notNull().default(false),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_log_alerta_criado_em").on(t.criadoEm),
    index("idx_log_alerta_tipo").on(t.tipo),
  ],
);

export type LogAlerta = typeof logAlerta.$inferSelect;
export type NovoLogAlerta = typeof logAlerta.$inferInsert;
