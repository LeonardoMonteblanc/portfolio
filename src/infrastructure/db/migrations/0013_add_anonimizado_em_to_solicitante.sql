-- Migration: Add anonimizado_em to solicitante table
ALTER TABLE "solicitante" ADD COLUMN "anonimizado_em" timestamp with time zone;