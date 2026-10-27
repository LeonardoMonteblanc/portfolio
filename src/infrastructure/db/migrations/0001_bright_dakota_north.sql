CREATE TABLE "administrador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(120) NOT NULL,
	"email" varchar(120) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_troca_senha" timestamp with time zone,
	CONSTRAINT "administrador_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "log_login" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_logout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_falha_login" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"email_tentado" varchar(120) NOT NULL,
	"motivo" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_recuperacao_senha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_id" uuid,
	"etapa" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" varchar(45) NOT NULL,
	"rota" varchar(100) NOT NULL,
	"limite" integer NOT NULL
);
