// src/infrastructure/db/schema/logs/log-categoria.ts
import { pgTable, uuid, text, varchar } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logCategoria = pgTable("log_categoria", {
  ...camposComunsLog,
  categoriaId: uuid("categoria_id").notNull(),
  acao: varchar("acao", { length: 30 }).notNull(),
  snapshotAntes: text("snapshot_antes"),
  snapshotDepois: text("snapshot_depois"),
  categoriaDestinoId: uuid("categoria_destino_id"),
});

export type LogCategoria = typeof logCategoria.$inferSelect;
export type NovoLogCategoria = typeof logCategoria.$inferInsert;
