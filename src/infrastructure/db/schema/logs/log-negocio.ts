// src/infrastructure/db/schema/logs/log-negocio.ts
import { pgTable, uuid, text, varchar } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logNegocio = pgTable("log_negocio", {
  ...camposComunsLog,
  negocioId: uuid("negocio_id").notNull(),
  acao: varchar("acao", { length: 30 }).notNull(),
  snapshotAntes: text("snapshot_antes"),
  snapshotDepois: text("snapshot_depois"),
});

export type LogNegocio = typeof logNegocio.$inferSelect;
export type NovoLogNegocio = typeof logNegocio.$inferInsert;
