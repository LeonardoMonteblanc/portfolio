-- 0016: tabela de alertas operacionais (RF-068 / RNF-025 / RNF-031 / F9-11).
-- Separada de vw_auditoria_consolidada: alerta é telemetria do sistema, não
-- ação sobre dado pessoal. `entregue` só é true quando os três canais
-- confirmaram — alerta parcial precisa aparecer como parcial, não como sucesso.
CREATE TABLE IF NOT EXISTS "log_alerta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(60) NOT NULL,
	"severidade" varchar(20) NOT NULL,
	"mensagem" text NOT NULL,
	"contexto" jsonb,
	"canais" jsonb,
	"entregue" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_log_alerta_criado_em" ON "log_alerta" USING btree ("criado_em");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_log_alerta_tipo" ON "log_alerta" USING btree ("tipo");
