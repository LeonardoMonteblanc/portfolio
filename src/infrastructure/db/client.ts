import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Build-time fallback for DATABASE_URL (Vercel build doesn't have env vars)
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const connectionString =
  process.env.DATABASE_URL ||
  (isBuildPhase ? "postgresql://build:build@localhost:5432/build" : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

/**
 * Cliente cru (postgres.js) para o que o Drizzle não cobre: cursores de
 * exportação do backup, DDL de manutenção e consultas ao catálogo do Postgres.
 * Regra: nada de SQL montado com valor de usuário por aqui — só nomes de
 * tabela vindos do catálogo, sempre citados com aspas duplas.
 */
export const sqlBruto = client;
