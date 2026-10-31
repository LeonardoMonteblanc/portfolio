import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      CREATE TABLE "log_auditoria" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
        "ator_tipo" varchar(20) NOT NULL,
        "ator_id" uuid,
        "ip_origem" varchar(45),
        "user_agent" varchar(500),
        "request_id" uuid,
        "acao" varchar(50) NOT NULL,
        "entidade_tipo" varchar(50) NOT NULL,
        "entidade_id" uuid,
        "detalhes" jsonb NOT NULL,
        "snapshot_antes" jsonb,
        "snapshot_depois" jsonb
      );
    `);
    console.log("✅ log_auditoria criada");

    await db.execute(
      sql`CREATE INDEX "idx_log_auditoria_criado_em" ON "log_auditoria" USING btree ("criado_em");`,
    );
    console.log("✅ idx criado_em");

    await db.execute(
      sql`CREATE INDEX "idx_log_auditoria_ator_id" ON "log_auditoria" USING btree ("ator_id");`,
    );
    console.log("✅ idx ator_id");

    await db.execute(
      sql`CREATE INDEX "idx_log_auditoria_entidade" ON "log_auditoria" USING btree ("entidade_tipo","entidade_id");`,
    );
    console.log("✅ idx entidade");

    await db.execute(
      sql`CREATE INDEX "idx_log_auditoria_acao" ON "log_auditoria" USING btree ("acao");`,
    );
    console.log("✅ idx acao");

    console.log("🎉 Migration 0011 aplicada com sucesso!");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("ℹ️  Já existe:", e.message.split("\n")[0]);
    } else {
      console.error("❌ Erro:", e.message);
    }
  }
  process.exit(0);
}

run();
