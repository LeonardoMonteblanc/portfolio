CREATE TABLE IF NOT EXISTS "log_auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ator_tipo" varchar(20) NOT NULL,
	"ator_id" uuid,
	"ip_origem" varchar(45),
	"user_agent" varchar(500),
	"request_id" uuid,
	"acao" varchar(50) NOT NULL,
	"entidade_tipo" varchar(50) NOT NULL,
	"entidade_id" uuid,
	"detalhes" jsonb NOT NULL,
	"snapshot_antes" jsonb,
	"snapshot_depois" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_log_auditoria_criado_em" ON "log_auditoria" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_log_auditoria_ator_id" ON "log_auditoria" USING btree ("ator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_log_auditoria_entidade" ON "log_auditoria" USING btree ("entidade_tipo","entidade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_log_auditoria_acao" ON "log_auditoria" USING btree ("acao");