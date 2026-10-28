// src/application/categorias/editar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { categoria } from "@/infrastructure/db/schema/categoria";
import { eq } from "drizzle-orm";
import { logCategoria } from "@/infrastructure/db/schema/logs";

const editarCategoriaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1).max(100).optional(),
  descricao: z.string().max(500).optional(),
});

export async function editarCategoriaAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    id: formData.get("id"),
    nome: formData.get("nome") || undefined,
    descricao: formData.get("descricao") || undefined,
  };

  const parseResult = editarCategoriaSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos." };
  }

  const { id, nome, descricao } = parseResult.data;

  const atual = await db.query.categoria.findFirst({
    where: eq(categoria.id, id),
  });
  if (!atual) {
    return { error: "Categoria não encontrada." };
  }

  // Se mudou o nome, verificar duplicata
  if (nome && nome !== atual.nome) {
    const nomeNormalizado = nome
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const existente = await db.query.categoria.findFirst({
      where: eq(categoria.nome, nomeNormalizado),
    });
    if (existente && existente.id !== id) {
      return { error: "Já existe uma categoria com este nome." };
    }
  }

  const snapshotAntes = { ...atual };

  const atualizada = await db
    .update(categoria)
    .set({
      nome:
        nome
          ?.trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") ?? atual.nome,
      descricao: descricao?.trim() ?? atual.descricao,
    })
    .where(eq(categoria.id, id))
    .returning();

  // Log de auditoria
  await db.insert(logCategoria).values({
    atorTipo: "admin",
    categoriaId: id,
    acao: "editar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(atualizada[0]),
  });

  return { success: true, categoria: atualizada[0] };
}
