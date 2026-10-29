// src/scripts/migrate.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/infrastructure/db/schema";

const connectionString = process.env.DATABASE_URL ?? "";

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

async function runMigrations() {
  console.log("Running database migrations...");

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    // Forçar aplicação de migration pendente para anonimizado_em
    console.log("Checking/adding anonimizado_em column...");
    await client`ALTER TABLE "solicitante" ADD COLUMN IF NOT EXISTS "anonimizado_em" timestamp with time zone`;
    console.log("Column anonimizado_em ensured");

    await migrate(db, {
      migrationsFolder: "./src/infrastructure/db/migrations",
    });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration script failed:", err);
    process.exit(1);
  });
