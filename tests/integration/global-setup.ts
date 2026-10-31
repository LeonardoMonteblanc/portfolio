import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Sobe o banco de testes de integração do zero, aplicando TODAS as migrations.
 *
 * Segurança: só aceita host local. Nunca aponte `TEST_DATABASE_URL` para o
 * Neon — o banco é apagado e recriado a cada execução.
 */
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

export function urlBancoDeTeste(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    "postgresql://dev:dev@localhost:5432/diretorio_test"
  );
}

function validarHostLocal(url: string): URL {
  const parsed = new URL(url);
  if (!HOSTS_LOCAIS.has(parsed.hostname)) {
    throw new Error(
      `[testes] TEST_DATABASE_URL aponta para "${parsed.hostname}". ` +
        "Os testes de integração recriam o banco e só rodam em host local.",
    );
  }
  return parsed;
}

export default async function globalSetup(): Promise<void> {
  const url = urlBancoDeTeste();
  const parsed = validarHostLocal(url);
  const nomeBanco = parsed.pathname.replace(/^\//, "");

  if (!/^[a-z0-9_]+$/i.test(nomeBanco)) {
    throw new Error(`[testes] nome de banco inválido: ${nomeBanco}`);
  }

  const adminUrl = `${parsed.protocol}//${parsed.username}:${parsed.password}@${parsed.hostname}:${parsed.port || "5432"}/postgres`;
  const admin = postgres(adminUrl, { prepare: false, max: 1 });

  try {
    await admin.unsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${nomeBanco}'`,
    );
    await admin.unsafe(`DROP DATABASE IF EXISTS "${nomeBanco}"`);
    await admin.unsafe(`CREATE DATABASE "${nomeBanco}"`);
  } finally {
    await admin.end({ timeout: 5 });
  }

  const cliente = postgres(url, { prepare: false, max: 1 });
  try {
    const db = drizzle(cliente);
    await migrate(db, {
      migrationsFolder: path.resolve(
        process.cwd(),
        "src/infrastructure/db/migrations",
      ),
    });
  } finally {
    await cliente.end({ timeout: 5 });
  }
}
