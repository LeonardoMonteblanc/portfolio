CREATE TABLE IF NOT EXISTS "imagem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"solicitacao_id" uuid,
	"anexo_origem_id" uuid,
	"tipo" varchar(20) NOT NULL,
	"situacao" varchar(20) DEFAULT 'pendente' NOT NULL,
	"url" text NOT NULL,
	"justificativa_rejeicao" text,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anexo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitacao_id" uuid NOT NULL,
	"arquivo_url" text NOT NULL,
	"nome_original" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tamanho_bytes" integer NOT NULL,
	"situacao" varchar(20) DEFAULT 'recebido' NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "log_imagem" (
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
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "log_anexo" (
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
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "votacao" ALTER COLUMN "situacao" SET DEFAULT 'em_andamento';
--> statement-breakpoint
ALTER TABLE "solicitacao" ADD COLUMN IF NOT EXISTS "origem_decisao" varchar(20);
--> statement-breakpoint
ALTER TABLE "forum_publicacao" ADD COLUMN IF NOT EXISTS "tipo" varchar(20) DEFAULT 'comentario' NOT NULL;
--> statement-breakpoint
ALTER TABLE "voto" ADD COLUMN IF NOT EXISTS "escolha" varchar(20) NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'imagem_negocio_id_negocio_id_fk') THEN
    ALTER TABLE "imagem" ADD CONSTRAINT "imagem_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'imagem_solicitacao_id_solicitacao_id_fk') THEN
    ALTER TABLE "imagem" ADD CONSTRAINT "imagem_solicitacao_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'imagem_anexo_origem_id_anexo_id_fk') THEN
    ALTER TABLE "imagem" ADD CONSTRAINT "imagem_anexo_origem_id_anexo_id_fk" FOREIGN KEY ("anexo_origem_id") REFERENCES "public"."anexo"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anexo_solicitacao_id_solicitacao_id_fk') THEN
    ALTER TABLE "anexo" ADD CONSTRAINT "anexo_solicitacao_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$
--> statement-breakpoint
ALTER TABLE "voto" DROP COLUMN IF EXISTS "valor";
