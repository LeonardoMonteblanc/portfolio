-- 0014: tabela de parâmetros operacionais (Modelo de Dados § 2.19 / RF-061).
-- Idempotente: pode rodar em banco que já tenha a tabela.

CREATE TABLE IF NOT EXISTS "configuracao" (
	"chave" varchar(80) PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" uuid NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracao_atualizado_por_administrador_id_fk'
  ) THEN
    ALTER TABLE "configuracao"
      ADD CONSTRAINT "configuracao_atualizado_por_administrador_id_fk"
      FOREIGN KEY ("atualizado_por") REFERENCES "public"."administrador"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
