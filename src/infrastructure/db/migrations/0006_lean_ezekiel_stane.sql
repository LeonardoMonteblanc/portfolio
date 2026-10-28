CREATE TABLE "log_solicitacao_analisada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"solicitacao_id" uuid NOT NULL,
	"decisao" varchar(20) NOT NULL,
	"justificativa" text,
	"negocio_id" uuid
);
