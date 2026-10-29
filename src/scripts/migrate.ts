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
