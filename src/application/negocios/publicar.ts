// src/application/negocios/publicar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  negocio,
  contato,
  negocioCategoria,
  categoria,
} from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { logNegocio } from "@/infrastructure/db/schema/logs";
import { appendLog } from "@/infrastructure/audit/audit.service";
import { exigirContextoAdmin } from "@/lib/audit-context";

const publicarSchema = z.object({
  id: z.string().uuid(),
});

export async function publicarNegocioAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = { id: formData.get("id") };
  const parseResult = publicarSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "ID inválido." };
  }

  const { id } = parseResult.data;

  const contexto = await exigirContextoAdmin();

  const n = await db.query.negocio.findFirst({
    where: eq(negocio.id, id),
    with: {
      contatos: true,
      categorias: { with: { categoria: true } },
    },
  });

  if (!n) {
    return { error: "Negócio não encontrado." };
  }

  // Verificar elegibilidade - usando select explícito para tipagem correta
  const contatosValidos = await db
    .select()
    .from(contato)
    .where(and(eq(contato.negocioId, id), eq(contato.valido, true)));
  const categoriasAtivas = await db
    .select({ ativa: categoria.ativa })
    .from(negocioCategoria)
    .innerJoin(categoria, eq(negocioCategoria.categoriaId, categoria.id))
    .where(eq(negocioCategoria.negocioId, id));

  const temCategoriaAtiva = categoriasAtivas.some((c): boolean => c.ativa);

  const erros: string[] = [];
  if (!n.aprovacaoVigenteId) erros.push("Sem aprovação vigente");
  if (!n.nome?.trim()) erros.push("Nome ausente");
  if (!n.descricao?.trim()) erros.push("Descrição ausente");
  if (contatosValidos.length === 0) erros.push("Sem contato válido");
  if (!temCategoriaAtiva) erros.push("Sem categoria ativa");

  if (erros.length > 0) {
    return { error: "Negócio não elegível: " + erros.join(", ") };
  }

  const snapshotAntes = { ...n };

  const [atualizado] = await db
    .update(negocio)
    .set({ situacaoPublicacao: "publicado", atualizadoEm: new Date() })
    .where(eq(negocio.id, id))
    .returning();

  await db.insert(logNegocio).values({
    atorTipo: "admin",
    atorId: contexto.atorId,
    negocioId: id,
    acao: "publicar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(atualizado),
  });

  await appendLog({
    ...contexto,
    acao: "publicar_negocio",
    entidadeTipo: "negocio",
    entidadeId: id,
    detalhes: { slug: atualizado?.slug ?? null },
    snapshotAntes: { situacaoPublicacao: snapshotAntes.situacaoPublicacao },
    snapshotDepois: { situacaoPublicacao: atualizado?.situacaoPublicacao },
  });

  return { success: true, negocio: atualizado };
}

export async function despublicarNegocioAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = { id: formData.get("id") };
  const parseResult = publicarSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "ID inválido." };
  }

  const { id } = parseResult.data;

  const contexto = await exigirContextoAdmin();

  const n = await db.query.negocio.findFirst({ where: eq(negocio.id, id) });
  if (!n) {
    return { error: "Negócio não encontrado." };
  }

  if (n.situacaoPublicacao !== "publicado") {
    return { error: "Negócio não está publicado." };
  }

  const snapshotAntes = { ...n };

  const [atualizado] = await db
    .update(negocio)
    .set({ situacaoPublicacao: "nao_publicado", atualizadoEm: new Date() })
    .where(eq(negocio.id, id))
    .returning();

  await db.insert(logNegocio).values({
    atorTipo: "admin",
    atorId: contexto.atorId,
    negocioId: id,
    acao: "despublicar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(atualizado),
  });

  await appendLog({
    ...contexto,
    acao: "despublicar_negocio",
    entidadeTipo: "negocio",
    entidadeId: id,
    detalhes: { slug: atualizado?.slug ?? null },
    snapshotAntes: { situacaoPublicacao: snapshotAntes.situacaoPublicacao },
    snapshotDepois: { situacaoPublicacao: atualizado?.situacaoPublicacao },
  });

  return { success: true, negocio: atualizado };
}
