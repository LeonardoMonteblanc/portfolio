// src/infrastructure/db/schema/logs/log-vinculacao-solicitacao.ts
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { camposComunsLog } from "./log-base";

export const logVinculacaoSolicitacao = pgTable("log_vinculacao_solicitacao", {
  ...camposComunsLog,
  solicitacaoId: uuid("solicitacao_id").notNull(),
  negocioIdAntes: uuid("negocio_id_antes"),
  negocioIdDepois: uuid("negocio_id_depois"),
});

export type LogVinculacaoSolicitacao =
  typeof logVinculacaoSolicitacao.$inferSelect;
export type NovoLogVinculacaoSolicitacao =
  typeof logVinculacaoSolicitacao.$inferInsert;
