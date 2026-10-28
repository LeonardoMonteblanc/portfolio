CREATE TABLE "log_sugestao_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"sugestao_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL,
	"categoria_criada_id" uuid
);
--> statement-breakpoint
CREATE TABLE "log_comunicacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"destinatario" varchar(255) NOT NULL,
	"sucesso" boolean NOT NULL,
	"erro" text
);
