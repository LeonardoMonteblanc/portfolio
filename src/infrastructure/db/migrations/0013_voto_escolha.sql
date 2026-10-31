-- 0013: alinha a tabela "voto" com o domínio (coluna escolha).
-- Contexto: o schema Drizzle declara voto.escolha ('aprovacao' | 'rejeicao'),
-- mas o banco de produção ainda tinha voto.valor NOT NULL, o que impedia
-- qualquer INSERT feito pela aplicação (violação de NOT NULL). Ver RN/ME-03.

ALTER TABLE "voto" ADD COLUMN IF NOT EXISTS "escolha" varchar(20);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voto' AND column_name = 'valor'
  ) THEN
    EXECUTE 'UPDATE "voto" SET "escolha" = CASE WHEN "valor" IN (''aprovacao'', ''sim'') THEN ''aprovacao'' ELSE ''rejeicao'' END WHERE "escolha" IS NULL';
    EXECUTE 'ALTER TABLE "voto" ALTER COLUMN "valor" DROP NOT NULL';
  END IF;
END $$;

ALTER TABLE "voto" ALTER COLUMN "escolha" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_voto" ON "voto" USING btree ("votacao_id", "admin_id");
