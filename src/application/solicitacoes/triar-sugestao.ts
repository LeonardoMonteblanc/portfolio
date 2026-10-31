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
import { appendLog } from "@/infrastructure/audit/audit.service";
import { exigirContextoAdmin } from "@/lib/audit-context";

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

  // Autoriza a action (sem isso qualquer POST direto triaria sugestões).
  const contexto = await exigirContextoAdmin();

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
        adminId: contexto.atorId,
        justificativaInterna: acao === "rejeitar" ? justificativaInterna : null,
        triadaEm: new Date(),
      })
      .where(eq(sugestaoCategoria.id, sugestaoId))
      .returning();

    if (!sugestaoAtualizada) throw new Error("Falha ao atualizar sugestão");

    // Evento específico + índice de auditoria (RF-062), na mesma transação.
    await tx.insert(logSugestaoCategoria).values({
      atorTipo: "admin",
      atorId: contexto.atorId,
      sugestaoId,
      acao,
      categoriaCriadaId,
    });

    await appendLog(
      {
        ...contexto,
        acao: `triar_sugestao_${acao}`,
        entidadeTipo: "sugestao_categoria",
        entidadeId: sugestaoId,
        detalhes: {
          acao,
          categoriaCriadaId,
          justificativaInterna: justificativaInterna ?? null,
        },
        snapshotAntes: { situacao: "pendente" },
        snapshotDepois: { situacao: novaSituacao },
      },
      tx,
    );

    return { sugestao: sugestaoAtualizada, categoriaCriadaId };
  });

  // Enviar e-mail transacional
  if (sugestao.solicitacao) {
    const solicitante = await db.query.solicitante.findFirst({
      where: (s, { eq }) => eq(s.id, sugestao.solicitacao.solicitanteId),
    });

    let envioOk = false;
    let erroEnvio: string | null = null;

    if (solicitante) {
      try {
        const envio = await enviarEmailSugestaoCategoria(
          solicitante.email,
          solicitante.nome,
          sugestao.textoSugerido,
          acao === "aceitar",
        );
        envioOk = envio.success;
        erroEnvio = envio.error ?? null;
      } catch (erro) {
        erroEnvio = erro instanceof Error ? erro.message : "erro desconhecido";
      }
    }

    if (!envioOk) {
      console.error("[Sugestão] Falha ao enviar e-mail:", erroEnvio);
    }

    // Log de comunicação com o resultado real do envio.
    await db.insert(logComunicacao).values({
      atorTipo: "sistema",
      tipo: "sugestao_categoria",
      destinatario: solicitante?.email ?? "",
      sucesso: envioOk,
      erro: erroEnvio,
    });
  }

  return { success: true, sugestao: resultado.sugestao };
}
