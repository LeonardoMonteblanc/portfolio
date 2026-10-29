// src/application/categorias/reativar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { categoria } from "@/infrastructure/db/schema/categoria";
import { eq } from "drizzle-orm";
import { logCategoria } from "@/infrastructure/db/schema/logs";

const reativarCategoriaSchema = z.object({
  id: z.string().uuid(),
});

export async function reativarCategoriaAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = { id: formData.get("id") };
  const parseResult = reativarCategoriaSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "ID inválido." };
  }

  const { id } = parseResult.data;

  const atual = await db.query.categoria.findFirst({
    where: eq(categoria.id, id),
  });
  if (!atual) {
    return { error: "Categoria não encontrada." };
  }

  if (atual.ativa) {
    return { error: "Categoria já está ativa." };
  }

  const snapshotAntes = { ...atual };

  const atualizada = await db
    .update(categoria)
    .set({ ativa: true })
    .where(eq(categoria.id, id))
    .returning();

  await db.insert(logCategoria).values({
    atorTipo: "admin",
    categoriaId: id,
    acao: "reativar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(atualizada[0]),
  });

  return { success: true, categoria: atualizada[0] };
}
