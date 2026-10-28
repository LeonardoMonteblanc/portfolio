CREATE TABLE "solicitante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(120) NOT NULL,
	"email" varchar(120) NOT NULL,
	"telefone" varchar(20) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"anonimizado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "solicitacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"negocio_id" uuid,
	"tipo" varchar(20) NOT NULL,
	"situacao" varchar(40) DEFAULT 'recebida' NOT NULL,
	"declaracao_vinculo" text NOT NULL,
	"dados_negocio_proposto" jsonb NOT NULL,
	"duplicata_detectada" boolean DEFAULT false NOT NULL,
	"motivo_incompleta" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sugestao_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitacao_id" uuid NOT NULL,
	"texto_sugerido" varchar(150) NOT NULL,
	"situacao" varchar(20) DEFAULT 'pendente' NOT NULL,
	"categoria_criada_id" uuid,
	"admin_id" uuid,
	"justificativa_interna" text,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"triada_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "documento_termo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"versao" varchar(20) NOT NULL,
	"conteudo" text NOT NULL,
	"publicado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aceite_termo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"documento_termo_id" uuid NOT NULL,
	"aceito_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_origem" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "log_solicitacao_recebida" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"solicitacao_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_vinculacao_solicitacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"solicitacao_id" uuid NOT NULL,
	"negocio_id_antes" uuid,
	"negocio_id_depois" uuid
);
--> statement-breakpoint
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_solicitante_id_solicitante_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."solicitante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sugestao_categoria" ADD CONSTRAINT "sugestao_categoria_solicitacao_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sugestao_categoria" ADD CONSTRAINT "sugestao_categoria_categoria_criada_id_categoria_id_fk" FOREIGN KEY ("categoria_criada_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aceite_termo" ADD CONSTRAINT "aceite_termo_solicitante_id_solicitante_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."solicitante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aceite_termo" ADD CONSTRAINT "aceite_termo_documento_termo_id_documento_termo_id_fk" FOREIGN KEY ("documento_termo_id") REFERENCES "public"."documento_termo"("id") ON DELETE no action ON UPDATE no action;