// src/application/governanca/forum.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  forumPublicacao,
  contestacao,
  votacao,
  negocio,
  solicitacao,
} from "@/infrastructure/db/schema";
import {
  logForum,
  logContestacao,
  logVotacao,
} from "@/infrastructure/db/schema/logs";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  transicionarSolicitacao,
  transicionarPublicacao,
} from "@/domain/state-machines";
import {
  ErroTransicaoInvalida,
  JustificativaObrigatoria,
} from "@/domain/errors";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";

const criarForumPublicacaoSchema = z.object({
  negocioId: z.string().uuid(),
  conteudo: z.string().min(1).max(5000),
  comentarioPaiId: z.string().uuid().optional(),
  tipo: z.enum(["comentario", "concordancia", "discordancia"]),
});

export async function criarForumPublicacaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    negocioId: formData.get("negocioId"),
    conteudo: formData.get("conteudo"),
    comentarioPaiId: formData.get("comentarioPaiId") || undefined,
    tipo: formData.get("tipo"),
  };

  const parseResult = criarForumPublicacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { negocioId, conteudo, comentarioPaiId, tipo } = parseResult.data;

  // Verificar se o negócio existe
  const neg = await db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.id, negocioId),
  });

  if (!neg) {
    return { error: "Negócio não encontrado" };
  }

  // Se for resposta a outro comentário, verificar se o pai existe
  if (comentarioPaiId) {
    const pai = await db.query.forumPublicacao.findFirst({
      where: (f, { eq }) => eq(f.id, comentarioPaiId),
    });
    if (!pai) {
      return { error: "Comentário pai não encontrado" };
    }
  }

  await db.transaction(async (tx) => {
    // Criar publicação no fórum
    const [publicacao] = await tx
      .insert(forumPublicacao)
      .values({
        negocioId,
        autorId: admin.id,
        autorTipo: "admin",
        conteudo,
        comentarioPaiId,
        tipo,
      })
      .returning();

    if (!publicacao) {
      throw new Error("Falha ao criar publicação no fórum");
    }

    // Log de auditoria
    await tx.insert(logForum).values({
      atorTipo: "admin" as const,
      atorId: admin.id,
      publicacaoId: publicacao.id,
      acao: "criar" as const,
      conteudoNovo: conteudo,
    } satisfies typeof logForum.$inferInsert);
  });

  revalidatePath(`/admin/solicitacoes`);
  revalidatePath(`/admin/negocios/${negocioId}`);

  return { success: true };
}

const listarForumPublicacoesSchema = z.object({
  negocioId: z.string().uuid(),
});

export async function listarForumPublicacoesAction(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: true; publicacoes: any[] } | { error: string }> {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    negocioId: formData.get("negocioId"),
  };

  const parseResult = listarForumPublicacoesSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos" };
  }

  const { negocioId } = parseResult.data;

  const publicacoes = await db.query.forumPublicacao.findMany({
    where: (f, { eq }) => eq(f.negocioId, negocioId),
    orderBy: (f, { asc }) => [asc(f.criadaEm)],
    with: {
      autor: {
        columns: { id: true, nome: true },
      },
    },
  });

  return { success: true, publicacoes };
}
