// src/infrastructure/db/schema/horario-funcionamento.ts
import {
  pgTable,
  uuid,
  integer,
  time,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { negocio } from "./negocio";

export const horarioFuncionamento = pgTable("horario_funcionamento", {
  id: uuid("id").primaryKey().defaultRandom(),
  negocioId: uuid("negocio_id")
    .notNull()
    .references(() => negocio.id, { onDelete: "cascade" }),
  diaSemana: integer("dia_semana").notNull(),
  horaAbertura: time("hora_abertura").notNull(),
  horaFechamento: time("hora_fechamento").notNull(),
  observacao: varchar("observacao", { length: 100 }),
});

export const horarioFuncionamentoRelations = relations(
  horarioFuncionamento,
  ({ one }) => ({
    negocio: one(negocio, {
      fields: [horarioFuncionamento.negocioId],
      references: [negocio.id],
    }),
  }),
);

export type HorarioFuncionamento = typeof horarioFuncionamento.$inferSelect;
export type NovoHorarioFuncionamento = typeof horarioFuncionamento.$inferInsert;
