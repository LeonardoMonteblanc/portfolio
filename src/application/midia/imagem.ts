// src/application/midia/imagem.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  imagem,
  negocio,
  solicitacao,
  anexo,
} from "@/infrastructure/db/schema";
import { logImagem, logAnexo } from "@/infrastructure/db/schema/logs";
import { eq, and, count, desc, sql } from "drizzle-orm";
import {
  transicionarImagem,
  type EventoImagem,
  type ContextoImagem,
} from "@/domain/state-machines";
import {
  ErroTransicaoInvalida,
  LimiteExcedido,
  ArquivoMuitoGrande,
  JustificativaObrigatoria,
} from "@/domain/errors";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";
import { appendLog } from "@/infrastructure/audit/audit.service";
import { contextoDaRequisicao } from "@/lib/audit-context";

const FORMATOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const enviarImagemSchema = z.object({
  negocioId: z.string().uuid(),
  solicitacaoId: z.string().uuid().optional(),
  tipo: z.enum(["logo", "foto"]),
  url: z.string().url(),
  anexoOrigemId: z.string().uuid().optional(),
});

export async function enviarImagemAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    negocioId: formData.get("negocioId"),
    solicitacaoId: formData.get("solicitacaoId") || undefined,
    tipo: formData.get("tipo"),
    url: formData.get("url"),
    anexoOrigemId: formData.get("anexoOrigemId") || undefined,
  };

  const parseResult = enviarImagemSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { negocioId, solicitacaoId, tipo, url, anexoOrigemId } =
    parseResult.data;

  // Verificar se o negócio existe
  const neg = await db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.id, negocioId),
  });

  if (!neg) {
    return { error: "Negócio não encontrado" };
  }

  // Contar imagens existentes do negócio
  const imagensExistentes = await db.query.imagem.findMany({
    where: (i, { eq, and }) =>
      and(eq(i.negocioId, negocioId), eq(i.situacao, "aprovada")),
  });

  const qtdLogo = imagensExistentes.filter((i) => i.tipo === "logo").length;
  const qtdFotos = imagensExistentes.filter((i) => i.tipo === "foto").length;

  let novaImagem: typeof imagem.$inferSelect | null = null;

  await db.transaction(async (tx) => {
    const result = await tx
      .insert(imagem)
      .values({
        negocioId,
        solicitacaoId,
        anexoOrigemId,
        tipo,
        url,
        situacao: "pendente",
      })
      .returning();

    novaImagem = result[0] || null;

    if (!novaImagem) throw new Error("Falha ao criar imagem");

    // Log de auditoria
    await tx.insert(logImagem).values({
      atorTipo: "admin",
      atorId: admin.id,
      imagemId: novaImagem.id,
      acao: "enviar",
      situacaoNova: "pendente",
    });

    await appendLog(
      {
        ...(await contextoDaRequisicao("admin", admin.id)),
        acao: "enviar_imagem",
        entidadeTipo: "imagem",
        entidadeId: novaImagem.id,
        detalhes: { negocioId, solicitacaoId: solicitacaoId ?? null, tipo },
        snapshotDepois: { situacao: "pendente" },
      },
      tx,
    );

    // Se houver anexo origem, atualizar anexo para 'disponibilizar'
    if (anexoOrigemId) {
      await tx
        .update(anexo)
        .set({ situacao: "disponivel" })
        .where(eq(anexo.id, anexoOrigemId));

      await tx.insert(logAnexo).values({
        atorTipo: "admin",
        atorId: admin.id,
        anexoId: anexoOrigemId,
        acao: "promover_a_imagem",
        situacaoAnterior: "recebido",
        situacaoNova: "disponivel",
      } satisfies typeof logAnexo.$inferInsert);
    }
  });

  if (!novaImagem) throw new Error("Falha ao criar imagem");

  revalidatePath(`/admin/negocios/${negocioId}`);
  if (solicitacaoId) {
    revalidatePath(`/admin/solicitacoes/${solicitacaoId}`);
  }

  return { success: true, imagemId: (novaImagem as any).id };
}

const moderarImagemSchema = z.object({
  imagemId: z.string().uuid(),
  acao: z.enum(["aprovar", "rejeitar"]),
  justificativa: z.string().optional(),
});

export async function moderarImagemAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    imagemId: formData.get("imagemId"),
    acao: formData.get("acao"),
    justificativa: formData.get("justificativa") || undefined,
  };

  const parseResult = moderarImagemSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { imagemId, acao, justificativa } = parseResult.data;

  const img = await db.query.imagem.findFirst({
    where: (i, { eq }) => eq(i.id, imagemId),
    with: { negocio: true },
  });

  if (!img) {
    return { error: "Imagem não encontrada" };
  }

  if (img.situacao !== "pendente") {
    return { error: "Imagem não está pendente de moderação" };
  }

  const evento: EventoImagem =
    acao === "aprovar" ? "APROVAR_IMAGEM" : "REJEITAR_IMAGEM";

  try {
    const novaSituacao = transicionarImagem(img.situacao as any, evento, {
      tipo: img.tipo as "logo" | "foto",
      tamanhoBytes: 0, // Não usado para aprovação/rejeição
      quantidadeAtualLogo: 0,
      quantidadeAtualFotos: 0,
      justificativa,
      formatosAceitos: [],
      tamanhoMaximoBytes: 0,
    });

    await db.transaction(async (tx) => {
      await tx
        .update(imagem)
        .set({
          situacao: novaSituacao,
          justificativaRejeicao: acao === "rejeitar" ? justificativa : null,
        })
        .where(eq(imagem.id, imagemId));

      await tx.insert(logImagem).values({
        atorTipo: "admin",
        atorId: admin.id,
        imagemId,
        acao,
        situacaoAnterior: img.situacao,
        situacaoNova: novaSituacao,
        justificativa,
      } satisfies typeof logImagem.$inferInsert);
    });

    revalidatePath(`/admin/negocios/${img.negocioId}`);

    return { success: true, situacao: novaSituacao };
  } catch (e) {
    if (e instanceof ErroTransicaoInvalida) {
      return { error: "Transição inválida" };
    }
    if (e instanceof JustificativaObrigatoria) {
      return { error: "Justificativa obrigatória para rejeitar" };
    }
    throw e;
  }
}

const reenviarImagemSchema = z.object({
  imagemId: z.string().uuid(),
  url: z.string().url(),
});

export async function reenviarImagemAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    imagemId: formData.get("imagemId"),
    url: formData.get("url"),
  };

  const parseResult = reenviarImagemSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { imagemId, url } = parseResult.data;

  const img = await db.query.imagem.findFirst({
    where: (i, { eq }) => eq(i.id, imagemId),
    with: { negocio: true },
  });

  if (!img) {
    return { error: "Imagem não encontrada" };
  }

  if (img.situacao !== "rejeitada") {
    return { error: "Só é possível reenviar imagens rejeitadas" };
  }

  await db.transaction(async (tx) => {
    const [novaImagem] = await tx
      .insert(imagem)
      .values({
        negocioId: img.negocioId,
        solicitacaoId: img.solicitacaoId,
        anexoOrigemId: img.anexoOrigemId,
        tipo: img.tipo,
        url,
        situacao: "pendente",
      })
      .returning();

    if (!novaImagem) throw new Error("Falha ao reenviar imagem");

    await tx.insert(logImagem).values({
      atorTipo: "admin",
      atorId: admin.id,
      imagemId: novaImagem.id,
      acao: "enviar",
      situacaoNova: "pendente",
    } satisfies typeof logImagem.$inferInsert);
  });

  revalidatePath(`/admin/negocios/${img.negocioId}`);

  return { success: true };
}

const listarImagensSchema = z.object({
  negocioId: z.string().uuid(),
});

export async function listarImagensAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    negocioId: formData.get("negocioId"),
  };

  const parseResult = listarImagensSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos" };
  }

  const { negocioId } = parseResult.data;

  const imagens = await db.query.imagem.findMany({
    where: (i, { eq }) => eq(i.negocioId, negocioId),
    orderBy: [sql`"criada_em" DESC`],
    with: {
      anexoOrigem: true,
    },
  });

  return { success: true, imagens };
}
