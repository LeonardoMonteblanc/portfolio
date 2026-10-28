// src/application/categorias/desativar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { categoria, negocioCategoria } from "@/infrastructure/db/schema";
import { eq, count } from "drizzle-orm";
import { logCategoria } from "@/infrastructure/db/schema/logs";

const desativarCategoriaSchema = z.object({
  id: z.string().uuid(),
});

export async function desativarCategoriaAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = { id: formData.get("id") };
  const parseResult = desativarCategoriaSchema.safeParse(rawData);
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

  if (!atual.ativa) {
    return { error: "Categoria já está desativada." };
  }

  // Verificar se há negócios associados
  const resultadoUso = await db
    .select({ total: count() })
    .from(negocioCategoria)
    .where(eq(negocioCategoria.categoriaId, id));

  const uso = resultadoUso[0];
  if (uso && uso.total > 0) {
    return {
      error: `Categoria em uso por ${uso.total} negócio(s). Mescle antes de desativar.`,
    };
  }

  const snapshotAntes = { ...atual };

  const atualizada = await db
    .update(categoria)
    .set({ ativa: false })
    .where(eq(categoria.id, id))
    .returning();

  await db.insert(logCategoria).values({
    atorTipo: "admin",
    categoriaId: id,
    acao: "desativar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(atualizada[0]),
  });

  return { success: true, categoria: atualizada[0] };
}
