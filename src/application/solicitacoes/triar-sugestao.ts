// src/application/solicitacoes/triar-sugestao.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  sugestaoCategoria,
  categoria,
  solicitante,
} from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import {
  logSugestaoCategoria,
  logComunicacao,
} from "@/infrastructure/db/schema/logs";
import { enviarEmailSugestaoCategoria } from "@/infrastructure/email/client";

const triarSugestaoSchema = z.object({
  sugestaoId: z.string().uuid(),
  acao: z.enum(["aceitar", "rejeitar"]),
  justificativaInterna: z.string().optional(),
});

export async function triarSugestaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    sugestaoId: formData.get("sugestaoId"),
    acao: formData.get("acao"),
    justificativaInterna: formData.get("justificativaInterna") || undefined,
  };

  const parseResult = triarSugestaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { sugestaoId, acao, justificativaInterna } = parseResult.data;

  const sugestao = (await db.query.sugestaoCategoria.findFirst({
    where: (s, { eq }) => eq(s.id, sugestaoId),
    with: {
      solicitacao: {
        with: {
          solicitante: true,
        },
      },
    },
  })) as any;

  if (!sugestao) {
    return { error: "Sugestão não encontrada" };
  }

  if (sugestao.situacao !== "pendente") {
    return { error: "Sugestão já foi triada" };
  }

  if (acao === "rejeitar" && !justificativaInterna?.trim()) {
    return { error: "Justificativa interna é obrigatória para rejeição" };
  }

  const resultado = await db.transaction(async (tx) => {
    let categoriaCriadaId: string | null = null;

    if (acao === "aceitar") {
      // Criar nova categoria
      const baseSlug = sugestao.textoSugerido
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const slugsExistentes = new Set(
        (await db.query.categoria.findMany({ columns: { slug: true } })).map(
          (c) => c.slug,
        ),
      );

      let slug = baseSlug;
      let i = 2;
      while (slugsExistentes.has(slug)) {
        slug = `${baseSlug}-${i}`;
        i++;
      }

      const [novaCategoria] = await tx
        .insert(categoria)
        .values({
          slug,
          nome: sugestao.textoSugerido.trim(),
          descricao: null,
          ativa: true,
        })
        .returning();

      if (!novaCategoria) throw new Error("Falha ao criar categoria");

      categoriaCriadaId = novaCategoria.id;
    }

    const novaSituacao = acao === "aceitar" ? "aceita" : "rejeitada";
    const [sugestaoAtualizada] = await tx
      .update(sugestaoCategoria)
      .set({
        situacao: novaSituacao,
        categoriaCriadaId: categoriaCriadaId,
        adminId: null, // TODO: obter do session/admin
        justificativaInterna: acao === "rejeitar" ? justificativaInterna : null,
        triadaEm: new Date(),
      })
      .where(eq(sugestaoCategoria.id, sugestaoId))
      .returning();

    if (!sugestaoAtualizada) throw new Error("Falha ao atualizar sugestão");

    // Log de auditoria
    await tx.insert(logSugestaoCategoria).values({
      atorTipo: "admin",
      sugestaoId,
      acao,
      categoriaCriadaId,
    });

    return { sugestao: sugestaoAtualizada, categoriaCriadaId };
  });

  // Enviar e-mail transacional
  if (sugestao.solicitacao) {
    const solicitante = await db.query.solicitante.findFirst({
      where: (s, { eq }) => eq(s.id, sugestao.solicitacao.solicitanteId),
    });

    if (solicitante) {
      await enviarEmailSugestaoCategoria(
        solicitante.email,
        solicitante.nome,
        sugestao.textoSugerido,
        acao === "aceitar",
      ).catch(console.error);
    }

    // Log de comunicação
    await db.insert(logComunicacao).values({
      atorTipo: "sistema",
      tipo: "sugestao_categoria",
      destinatario: solicitante?.email || "",
      sucesso: true,
    });
  }

  return { success: true, sugestao: resultado.sugestao };
}
