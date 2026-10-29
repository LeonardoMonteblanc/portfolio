// src/infrastructure/db/migrations/0010_media.sql
CREATE TABLE "imagem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"solicitacao_id" uuid,
	"anexo_origem_id" uuid,
	"tipo" varchar(20) NOT NULL, -- 'logo' | 'foto'
	"situacao" varchar(20) DEFAULT 'pendente' NOT NULL, -- 'pendente' | 'aprovada' | 'rejeitada'
	"url" text NOT NULL,
	"justificativa_rejeicao" text,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anexo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitacao_id" uuid NOT NULL,
	"arquivo_url" text NOT NULL,
	"nome_original" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tamanho_bytes" integer NOT NULL,
	"situacao" varchar(20) DEFAULT 'recebido' NOT NULL, -- 'recebido' | 'em_verificacao' | 'disponivel' | 'rejeitado'
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_imagem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"imagem_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL, -- 'enviar' | 'aprovar' | 'rejeitar' | 'promover'
	"situacao_anterior" varchar(20),
	"situacao_nova" varchar(20),
	"justificativa" text
);
--> statement-breakpoint
CREATE TABLE "log_anexo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"anexo_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL, -- 'enviar' | 'iniciar_verificacao' | 'disponibilizar' | 'rejeitar' | 'promover_a_imagem'
	"situacao_anterior" varchar(20),
	"situacao_nova" varchar(20)
);
--> statement-breakpoint
ALTER TABLE "imagem" ADD CONSTRAINT "imagem_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagem" ADD CONSTRAINT "imagem_solicitacao_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagem" ADD CONSTRAINT "imagem_anexo_origem_id_anexo_id_fk" FOREIGN KEY ("anexo_origem_id") REFERENCES "public"."anexo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexo" ADD CONSTRAINT "anexo_solicitacao_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_imagem" ADD CONSTRAINT "log_imagem_imagem_id_imagem_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."imagem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_anexo" ADD CONSTRAINT "log_anexo_anexo_id_anexo_id_fk" FOREIGN KEY ("anexo_id") REFERENCES "public"."anexo"("id") ON DELETE no action ON UPDATE no action;