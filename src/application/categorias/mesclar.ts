// src/application/categorias/mesclar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { categoria, negocioCategoria } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { logCategoria } from "@/infrastructure/db/schema/logs";

const mesclarCategoriaSchema = z.object({
  origemId: z.string().uuid(),
  destinoId: z.string().uuid(),
});

export async function mesclarCategoriasAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    origemId: formData.get("origemId"),
    destinoId: formData.get("destinoId"),
  };

  const parseResult = mesclarCategoriaSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "IDs inválidos." };
  }

  const { origemId, destinoId } = parseResult.data;

  if (origemId === destinoId) {
    return { error: "Origem e destino devem ser diferentes." };
  }

  const [origem, destino] = await Promise.all([
    db.query.categoria.findFirst({ where: eq(categoria.id, origemId) }),
    db.query.categoria.findFirst({ where: eq(categoria.id, destinoId) }),
  ]);

  if (!origem || !destino) {
    return { error: "Uma ou ambas as categorias não existem." };
  }

  // Migrar negócios da origem para o destino
  await db
    .update(negocioCategoria)
    .set({ categoriaId: destinoId })
    .where(eq(negocioCategoria.categoriaId, origemId));

  // Desativar origem
  const snapshotAntes = { ...origem };
  const origemDesativada = await db
    .update(categoria)
    .set({ ativa: false })
    .where(eq(categoria.id, origemId))
    .returning();

  // Log de auditoria
  await db.insert(logCategoria).values({
    atorTipo: "admin",
    categoriaId: origemId,
    acao: "mesclar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(origemDesativada[0]),
    categoriaDestinoId: destinoId,
  });

  return {
    success: true,
    categoriaOrigem: origemDesativada[0],
    categoriaDestino: destino,
  };
}
