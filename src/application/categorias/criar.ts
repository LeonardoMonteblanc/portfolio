// src/application/categorias/criar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { categoria } from "@/infrastructure/db/schema/categoria";
import { eq } from "drizzle-orm";
import { gerarSlugUnico } from "@/domain/utils/gerar-slug-unico";
import { normalizarSlug } from "@/domain/utils/normalizar-slug";
import { logCategoria } from "@/infrastructure/db/schema/logs";

const criarCategoriaSchema = z.object({
  nome: z.string().min(1).max(100),
  descricao: z.string().max(500).optional(),
});

export async function criarCategoriaAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
  };

  const parseResult = criarCategoriaSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return {
      error:
        errorMsg || "Nome da categoria é obrigatório (máx. 100 caracteres).",
    };
  }

  const { nome, descricao } = parseResult.data;

  // Verificar duplicata (normalizado)
  const nomeNormalizado = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const existente = await db.query.categoria.findFirst({
    where: eq(categoria.nome, nomeNormalizado),
  });

  if (existente) {
    return {
      error:
        "Já existe uma categoria com este nome (ignorando acentos e caixa).",
    };
  }

  const baseSlug = normalizarSlug(nome);
  const slugsExistentes = new Set(
    (await db.query.categoria.findMany({ columns: { slug: true } })).map(
      (c) => c.slug,
    ),
  );
  const slug = gerarSlugUnico(baseSlug, slugsExistentes);

  const nova = await db
    .insert(categoria)
    .values({
      slug,
      nome: nomeNormalizado,
      descricao: descricao?.trim() || null,
      ativa: true,
    })
    .returning();

  if (!nova[0]) {
    throw new Error("Falha ao criar categoria");
  }

  // Log de auditoria
  await db.insert(logCategoria).values({
    atorTipo: "admin",
    categoriaId: nova[0].id,
    acao: "criar",
    snapshotDepois: JSON.stringify(nova[0]),
  });

  return { success: true, categoria: nova[0] };
}
