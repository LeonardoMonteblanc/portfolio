CREATE TABLE "forum_publicacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"autor_tipo" varchar(20) NOT NULL,
	"conteudo" text NOT NULL,
	"comentario_pai_id" uuid,
	"editada" boolean DEFAULT false NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contestacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"solicitacao_origem_id" uuid,
	"autor_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"fundamentacao" text NOT NULL,
	"situacao" varchar(20) DEFAULT 'aberta' NOT NULL,
	"votacao_id" uuid,
	"decidida_em" timestamp with time zone,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contestacao_id" uuid NOT NULL,
	"pergunta" text NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"quorum_minimo" integer NOT NULL,
	"maioria_necessaria" integer NOT NULL,
	"situacao" varchar(20) DEFAULT 'aberta' NOT NULL,
	"iniciada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"encerra_em" timestamp with time zone NOT NULL,
	"encerrada_em" timestamp with time zone,
	"resultado" varchar(20),
	"total_votos" integer DEFAULT 0 NOT NULL,
	"votos_sim" integer DEFAULT 0 NOT NULL,
	"votos_nao" integer DEFAULT 0 NOT NULL,
	"votos_abstencao" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"votacao_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"valor" varchar(10) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_voto" UNIQUE("votacao_id","admin_id")
);
--> statement-breakpoint
CREATE TABLE "log_forum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"publicacao_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL,
	"conteudo_anterior" text,
	"conteudo_novo" text
);
--> statement-breakpoint
CREATE TABLE "log_contestacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"contestacao_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL,
	"situacao_anterior" varchar(20),
	"situacao_nova" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "log_votacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"votacao_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL,
	"situacao_anterior" varchar(20),
	"situacao_nova" varchar(20),
	"resultado" varchar(20),
	"total_votos" integer
);
--> statement-breakpoint
CREATE TABLE "log_suspensao_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_alvo_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL,
	"motivo" text NOT NULL,
	"ate" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "forum_publicacao" ADD CONSTRAINT "forum_publicacao_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_publicacao" ADD CONSTRAINT "forum_publicacao_autor_id_administrador_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."administrador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_publicacao" ADD CONSTRAINT "forum_publicacao_comentario_pai_id_forum_publicacao_id_fk" FOREIGN KEY ("comentario_pai_id") REFERENCES "public"."forum_publicacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contestacao" ADD CONSTRAINT "contestacao_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contestacao" ADD CONSTRAINT "contestacao_solicitacao_origem_id_solicitacao_id_fk" FOREIGN KEY ("solicitacao_origem_id") REFERENCES "public"."solicitacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contestacao" ADD CONSTRAINT "contestacao_autor_id_administrador_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."administrador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votacao" ADD CONSTRAINT "votacao_contestacao_id_contestacao_id_fk" FOREIGN KEY ("contestacao_id") REFERENCES "public"."contestacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voto" ADD CONSTRAINT "voto_votacao_id_votacao_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "public"."votacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voto" ADD CONSTRAINT "voto_admin_id_administrador_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."administrador"("id") ON DELETE no action ON UPDATE no action;