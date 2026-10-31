CREATE TABLE IF NOT EXISTS "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"payload" jsonb NOT NULL,
	"resultado" jsonb,
	"erro" text,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"max_tentativas" integer DEFAULT 3 NOT NULL,
	"agendado_para" timestamp with time zone DEFAULT now() NOT NULL,
	"iniciado_em" timestamp with time zone,
	"concluido_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "log_anonimizacao" (
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "log_configuracao" (
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