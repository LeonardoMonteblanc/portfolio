// src/infrastructure/db/schema/horario-funcionamento.ts
import {
  pgTable,
  uuid,
  integer,
  time,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
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

export type HorarioFuncionamento = typeof horarioFuncionamento.$inferSelect;
export type NovoHorarioFuncionamento = typeof horarioFuncionamento.$inferInsert;
