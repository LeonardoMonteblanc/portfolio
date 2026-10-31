import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("🔄 Iniciando criação de tabelas...");

    // Tabelas que faltam - executar cada uma separadamente com verificação
    const statements = [
      {
        name: "imagem",
        sql: `CREATE TABLE "imagem" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "negocio_id" uuid NOT NULL,
          "solicitacao_id" uuid,
          "anexo_origem_id" uuid,
          "tipo" varchar(20) NOT NULL,
          "situacao" varchar(20) DEFAULT 'pendente' NOT NULL,
          "url" text NOT NULL,
          "justificativa_rejeicao" text,
          "criada_em" timestamp with time zone DEFAULT now() NOT NULL
        )`,
      },
      {
        name: "anexo",
        sql: `CREATE TABLE "anexo" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "solicitacao_id" uuid NOT NULL,
          "arquivo_url" text NOT NULL,
          "nome_original" varchar(255) NOT NULL,
          "mime_type" varchar(100) NOT NULL,
          "tamanho_bytes" integer NOT NULL,
          "situacao" varchar(20) DEFAULT 'recebido' NOT NULL,
          "criada_em" timestamp with time zone DEFAULT now() NOT NULL
        )`,
      },
      {
        name: "log_imagem",
        sql: `CREATE TABLE "log_imagem" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "ator_tipo" varchar(20) NOT NULL,
          "ator_id" uuid,
          "ip_origem" varchar(45),
          "user_agent" varchar(500),
          "request_id" uuid,
          "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
          "imagem_id" uuid NOT NULL,
          "acao" varchar(20) NOT NULL,
          "situacao_anterior" varchar(20),
          "situacao_nova" varchar(20),
          "justificativa" text
        )`,
      },
      {
        name: "log_anexo",
        sql: `CREATE TABLE "log_anexo" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "ator_tipo" varchar(20) NOT NULL,
          "ator_id" uuid,
          "ip_origem" varchar(45),
          "user_agent" varchar(500),
          "request_id" uuid,
          "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
          "anexo_id" uuid NOT NULL,
          "acao" varchar(20) NOT NULL,
          "situacao_anterior" varchar(20),
          "situacao_nova" varchar(20)
        )`,
      },
      {
        name: "password_reset_token",
        sql: `CREATE TABLE "password_reset_token" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "admin_id" uuid NOT NULL,
          "hash" varchar(64) NOT NULL,
          "expires_at" timestamp with time zone NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        )`,
      },
    ];

    for (const stmt of statements) {
      try {
        await db.execute(stmt.sql);
        console.log(`✅ ${stmt.name} criada`);
      } catch (e: any) {
        if (e.message?.includes("already exists")) {
          console.log(`ℹ️  ${stmt.name} já existe`);
        } else {
          throw e;
        }
      }
    }

    // Foreign keys
    const fks = [
      {
        name: "FK imagem.negocio_id",
        sql: 'ALTER TABLE "imagem" ADD CONSTRAINT "imagem_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        name: "FK imagem.solicitacao_id",
        sql: 'ALTER TABLE "imagem" ADD CONSTRAINT "imagem_solicitacao_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        name: "FK imagem.anexo_origem_id",
        sql: 'ALTER TABLE "imagem" ADD CONSTRAINT "imagem_anexo_origem_id_anexo_id_fk" FOREIGN KEY ("anexo_origem_id") REFERENCES "public"."anexo"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        name: "FK anexo.solicitacao_id",
        sql: 'ALTER TABLE "anexo" ADD CONSTRAINT "anexo_solicitacao_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action',
      },
    ];

    for (const fk of fks) {
      try {
        await db.execute(fk.sql);
        console.log(`✅ ${fk.name}`);
      } catch (e: any) {
        if (e.message?.includes("already exists")) {
          console.log(`ℹ️  ${fk.name} já existe`);
        } else {
          throw e;
        }
      }
    }

    console.log("🎉 Tabelas criadas com sucesso!");
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

run();
