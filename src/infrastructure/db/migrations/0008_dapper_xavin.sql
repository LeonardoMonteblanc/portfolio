ALTER TABLE "negocio" ADD COLUMN "fonte" varchar(30) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "negocio" ADD COLUMN "solicitacao_origem_id" uuid;