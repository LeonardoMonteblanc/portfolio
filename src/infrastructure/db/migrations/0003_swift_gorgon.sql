CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"nome" varchar(100) NOT NULL,
	"descricao" text,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categoria_slug_unique" UNIQUE("slug"),
	CONSTRAINT "categoria_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "negocio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(150) NOT NULL,
	"nome" varchar(150) NOT NULL,
	"descricao" text NOT NULL,
	"situacao_publicacao" varchar(30) DEFAULT 'nao_elegivel' NOT NULL,
	"motivo_nao_elegivel" varchar(30),
	"aprovacao_vigente_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "negocio_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "negocio_categoria" (
	"negocio_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "negocio_categoria_negocio_id_categoria_id_pk" PRIMARY KEY("negocio_id","categoria_id")
);
--> statement-breakpoint
CREATE TABLE "contato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"valor" varchar(255) NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"valido" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "localizacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"endereco" text,
	"bairro" varchar(80),
	"area_atendimento" text,
	CONSTRAINT "localizacao_negocio_id_unique" UNIQUE("negocio_id")
);
--> statement-breakpoint
CREATE TABLE "horario_funcionamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"dia_semana" integer NOT NULL,
	"hora_abertura" time NOT NULL,
	"hora_fechamento" time NOT NULL,
	"observacao" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "log_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"acao" varchar(30) NOT NULL,
	"snapshot_antes" text,
	"snapshot_depois" text,
	"categoria_destino_id" uuid
);
--> statement-breakpoint
CREATE TABLE "log_negocio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"acao" varchar(30) NOT NULL,
	"snapshot_antes" text,
	"snapshot_depois" text
);
--> statement-breakpoint
ALTER TABLE "negocio_categoria" ADD CONSTRAINT "negocio_categoria_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_categoria" ADD CONSTRAINT "negocio_categoria_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contato" ADD CONSTRAINT "contato_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localizacao" ADD CONSTRAINT "localizacao_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horario_funcionamento" ADD CONSTRAINT "horario_funcionamento_negocio_id_negocio_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocio"("id") ON DELETE cascade ON UPDATE no action;