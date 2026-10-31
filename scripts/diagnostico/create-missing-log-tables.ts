import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("🔄 Criando tabelas de log faltantes...");

    // log_reabertura
    await db.execute(sql`
      CREATE TABLE "log_reabertura" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "ator_tipo" varchar(20) NOT NULL,
        "ator_id" uuid,
        "ip_origem" varchar(45),
        "user_agent" varchar(500),
        "request_id" uuid,
        "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
        "solicitacao_id" uuid NOT NULL,
        "decisao_original_id" uuid NOT NULL,
        "justificativa" text
      );
    `);
    console.log("✅ log_reabertura criada");

    // log_correcao
    await db.execute(sql`
      CREATE TABLE "log_correcao" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "ator_tipo" varchar(20) NOT NULL,
        "ator_id" uuid,
        "ip_origem" varchar(45),
        "user_agent" varchar(500),
        "request_id" uuid,
        "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
        "solicitacao_id" uuid NOT NULL,
        "acao" varchar(20) NOT NULL,
        "prazo_em" timestamp with time zone
      );
    `);
    console.log("✅ log_correcao criada");

    // log_cancelamento_fila
    await db.execute(sql`
      CREATE TABLE "log_cancelamento_fila" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "ator_tipo" varchar(20) NOT NULL,
        "ator_id" uuid,
        "ip_origem" varchar(45),
        "user_agent" varchar(500),
        "request_id" uuid,
        "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
        "solicitacao_id" uuid NOT NULL,
        "motivo" text
      );
    `);
    console.log("✅ log_cancelamento_fila criada");

    // log_configuracao
    await db.execute(sql`
      CREATE TABLE "log_configuracao" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "ator_tipo" varchar(20) NOT NULL,
        "ator_id" uuid,
        "ip_origem" varchar(45),
        "user_agent" varchar(500),
        "request_id" uuid,
        "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
        "chave" varchar(80) NOT NULL,
        "valor_antes" text,
        "valor_depois" text
      );
    `);
    console.log("✅ log_configuracao criada");

    // log_anonimizacao
    await db.execute(sql`
      CREATE TABLE "log_anonimizacao" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "ator_tipo" varchar(20) NOT NULL,
        "ator_id" uuid,
        "ip_origem" varchar(45),
        "user_agent" varchar(500),
        "request_id" uuid,
        "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
        "solicitante_id" uuid NOT NULL,
        "campos_anonimizados" text[] NOT NULL
      );
    `);
    console.log("✅ log_anonimizacao criada");

    console.log("🎉 Todas as tabelas faltantes criadas!");
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
