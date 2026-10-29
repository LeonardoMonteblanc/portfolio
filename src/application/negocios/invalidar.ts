// src/application/negocios/invalidar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { negocio } from "@/infrastructure/db/schema/negocio";
import { eq } from "drizzle-orm";
import { logNegocio } from "@/infrastructure/db/schema/logs";

const invalidarSchema = z.object({
  id: z.string().uuid(),
  motivo: z.enum([
    "aprovacao_ausente",
    "dados_incompletos",
    "categoria_removida",
    "contato_invalido",
  ]),
});

export async function invalidarElegibilidadeAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    id: formData.get("id"),
    motivo: formData.get("motivo"),
  };

  const parseResult = invalidarSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos." };
  }

  const { id, motivo } = parseResult.data;

  const n = await db.query.negocio.findFirst({
    where: (b, { eq }) => eq(b.id, id),
  });
  if (!n) {
    return { error: "Negócio não encontrado." };
  }

  if (n.situacaoPublicacao === "nao_elegivel") {
    return { error: "Negócio já é inelegível." };
  }

  const snapshotAntes = { ...n };

  const [atualizado] = await db
    .update(negocio)
    .set({
      situacaoPublicacao: "nao_elegivel",
      motivoNaoElegivel: motivo,
      atualizadoEm: new Date(),
    })
    .where(eq(negocio.id, id))
    .returning();

  await db.insert(logNegocio).values({
    atorTipo: "admin",
    negocioId: id,
    acao: "invalidar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(atualizado),
  });

  return { success: true, negocio: atualizado };
}
