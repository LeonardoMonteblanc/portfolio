// src/infrastructure/db/schema/logs/log-auditoria.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const logAuditoria = pgTable(
  "log_auditoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Ator
    atorTipo: varchar("ator_tipo", { length: 20 }).notNull(), // 'admin' | 'solicitante' | 'sistema' | 'desenvolvedor'
    atorId: uuid("ator_id"),
    ipOrigem: varchar("ip_origem", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    requestId: uuid("request_id"),

    // Ação e entidade
    acao: varchar("acao", { length: 50 }).notNull(),
    entidadeTipo: varchar("entidade_tipo", { length: 50 }).notNull(),
    entidadeId: uuid("entidade_id"),

    // Detalhes (JSONB flexível)
    detalhes: jsonb("detalhes").notNull(),

    // Snapshot antes/depois quando aplicável
    snapshotAntes: jsonb("snapshot_antes"),
    snapshotDepois: jsonb("snapshot_depois"),
  },
  (table) => ({
    idxCriadoEm: index("idx_log_auditoria_criado_em").on(table.criadoEm),
    idxAtorId: index("idx_log_auditoria_ator_id").on(table.atorId),
    idxEntidade: index("idx_log_auditoria_entidade").on(
      table.entidadeTipo,
      table.entidadeId,
    ),
    idxAcao: index("idx_log_auditoria_acao").on(table.acao),
  }),
);

export type LogAuditoria = typeof logAuditoria.$inferSelect;
export type NovaLogAuditoria = typeof logAuditoria.$inferInsert;
