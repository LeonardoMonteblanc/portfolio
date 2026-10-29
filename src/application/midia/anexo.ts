// src/application/midia/anexo.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { anexo, solicitacao, imagem } from "@/infrastructure/db/schema";
import { logAnexo, logImagem } from "@/infrastructure/db/schema/logs";
import { eq, and, count, desc, sql } from "drizzle-orm";
import {
  transicionarAnexo,
  type EventoAnexo,
  type ContextoAnexo,
} from "@/domain/state-machines";
import {
  ErroTransicaoInvalida,
  MimeInvalido,
  ArquivoMuitoGrande,
  LimiteAnexosExcedido,
} from "@/domain/errors";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";

const FORMATOS_ACEITOS_ANEXO = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024; // 10 MB
const MAX_ANEXOS = 3;

const enviarAnexoSchema = z.object({
  solicitacaoId: z.string().uuid(),
  arquivoUrl: z.string().url(),
  nomeOriginal: z.string().min(1).max(255),
  mimeType: z.string(),
  tamanhoBytes: z.number().int().positive(),
});

export async function enviarAnexoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    solicitacaoId: formData.get("solicitacaoId"),
    arquivoUrl: formData.get("arquivoUrl"),
    nomeOriginal: formData.get("nomeOriginal"),
    mimeType: formData.get("mimeType"),
    tamanhoBytes: parseInt(formData.get("tamanhoBytes") as string, 10),
  };

  const parseResult = enviarAnexoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { solicitacaoId, arquivoUrl, nomeOriginal, mimeType, tamanhoBytes } =
    parseResult.data;

  const sol = await db.query.solicitacao.findFirst({
    where: (s, { eq }) => eq(s.id, solicitacaoId),
    with: { negocio: true },
  });

  if (!sol) {
    return { error: "Solicitação não encontrada" };
  }

  // Contar anexos existentes da solicitação
  const qtdAnexos = await db.$count(
    anexo,
    eq(anexo.solicitacaoId, solicitacaoId),
  );

  const contexto: ContextoAnexo = {
    mimeType,
    tamanhoBytes,
    quantidadeAtual: qtdAnexos,
    formatosAceitos: FORMATOS_ACEITOS_ANEXO,
    tamanhoMaximoBytes: TAMANHO_MAXIMO_ANEXO,
    maxAnexos: MAX_ANEXOS,
  };

  try {
    transicionarAnexo(null, "ENVIAR_ANEXO", contexto);
  } catch (e) {
    if (e instanceof MimeInvalido) {
      return { error: `Formato de arquivo inválido: ${e.message}` };
    }
    if (e instanceof ArquivoMuitoGrande) {
      return {
        error: `Arquivo muito grande. Máximo: ${TAMANHO_MAXIMO_ANEXO / 1024 / 1024} MB`,
      };
    }
    if (e instanceof LimiteAnexosExcedido) {
      return { error: `Limite de ${MAX_ANEXOS} anexos excedido` };
    }
    if (e instanceof ErroTransicaoInvalida) {
      return { error: "Erro ao enviar anexo" };
    }
    throw e;
  }

  await db.transaction(async (tx) => {
    const [novoAnexo] = await tx
      .insert(anexo)
      .values({
        solicitacaoId,
        arquivoUrl,
        nomeOriginal,
        mimeType,
        tamanhoBytes,
        situacao: "recebido",
      })
      .returning();

    if (!novoAnexo) throw new Error("Falha ao criar anexo");

    await tx.insert(logAnexo).values({
      atorTipo: "admin",
      atorId: admin.id,
      anexoId: novoAnexo.id,
      acao: "enviar",
      situacaoNova: "recebido",
    } satisfies typeof logAnexo.$inferInsert);
  });

  revalidatePath(`/admin/solicitacoes/${solicitacaoId}`);

  return { success: true };
}

const atualizarSituacaoAnexoSchema = z.object({
  anexoId: z.string().uuid(),
  acao: z.enum([
    "iniciar_verificacao",
    "disponibilizar",
    "rejeitar",
    "promover_a_imagem",
  ]),
});

export async function atualizarSituacaoAnexoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    anexoId: formData.get("anexoId"),
    acao: formData.get("acao"),
  };

  const parseResult = atualizarSituacaoAnexoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { anexoId, acao } = parseResult.data;

  const an = await db.query.anexo.findFirst({
    where: (a, { eq }) => eq(a.id, anexoId),
    with: { solicitacao: { with: { negocio: true } } },
  });

  if (!an) {
    return { error: "Anexo não encontrado" };
  }

  const eventoMap: Record<string, EventoAnexo> = {
    iniciar_verificacao: "INICIAR_VERIFICACAO",
    disponibilizar: "DISPONIBILIZAR",
    rejeitar: "REJEITAR",
    promover_a_imagem: "PROMOVER_A_IMAGEM",
  };

  const evento = eventoMap[acao];
  if (!evento) {
    return { error: "Ação inválida" };
  }

  try {
    const novaSituacao = transicionarAnexo(an.situacao as any, evento, {
      mimeType: an.mimeType,
      tamanhoBytes: an.tamanhoBytes,
      quantidadeAtual: 0,
      formatosAceitos: [],
      tamanhoMaximoBytes: 0,
      maxAnexos: 0,
    });

    await db.transaction(async (tx) => {
      await tx
        .update(anexo)
        .set({ situacao: novaSituacao })
        .where(eq(anexo.id, an.id));

      await tx.insert(logAnexo).values({
        atorTipo: "admin",
        atorId: admin.id,
        anexoId: an.id,
        acao,
        situacaoAnterior: an.situacao,
        situacaoNova: novaSituacao,
      } satisfies typeof logAnexo.$inferInsert);
    });

    // Se promover a imagem, criar registro de imagem
    if (acao === "promover_a_imagem") {
      const anAtualizado = await db.query.anexo.findFirst({
        where: (a, { eq }) => eq(a.id, anexoId),
        with: { solicitacao: { with: { negocio: true } } },
      });

      const solicitacao = anAtualizado?.solicitacao as
        { id: string; negocioId: string } | undefined;
      if (anAtualizado && solicitacao && solicitacao.negocioId) {
        await db.insert(imagem).values({
          negocioId: solicitacao.negocioId,
          solicitacaoId: solicitacao.id,
          anexoOrigemId: an.id,
          tipo: (an.mimeType.startsWith("image/") ? "foto" : "logo") as
            "foto" | "logo",
          url: an.arquivoUrl,
          situacao: "pendente",
        });

        await db.insert(logImagem).values({
          atorTipo: "admin",
          atorId: admin.id,
          imagemId:
            (
              await db.query.imagem.findFirst({
                where: (i, { eq }) => eq(i.anexoOrigemId, anexoId),
              })
            )?.id || "",
          acao: "promover",
          situacaoNova: "pendente",
        } satisfies typeof logImagem.$inferInsert);
      }

      // Atualizar anexo para 'disponibilizar' (promoção não altera estado)
      await db
        .update(anexo)
        .set({ situacao: "disponivel" })
        .where(eq(anexo.id, anexoId));

      await db.insert(logAnexo).values({
        atorTipo: "admin",
        atorId: admin.id,
        anexoId: an.id,
        acao: "promover_a_imagem",
        situacaoAnterior: an.situacao,
        situacaoNova: "disponivel",
      } satisfies typeof logAnexo.$inferInsert);
    }

    // Buscar solicitaçãoId para revalidate
    const anAtualizado = await db.query.anexo.findFirst({
      where: (a, { eq }) => eq(a.id, anexoId),
      with: { solicitacao: true },
    });

    revalidatePath(`/admin/solicitacoes/${anAtualizado?.solicitacaoId}`);

    return { success: true, situacao: novaSituacao };
  } catch (e) {
    if (e instanceof ErroTransicaoInvalida) {
      return { error: "Transição inválida para o estado atual" };
    }
    throw e;
  }
}

const listarAnexosSchema = z.object({
  solicitacaoId: z.string().uuid(),
});

export async function listarAnexosAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    solicitacaoId: formData.get("solicitacaoId"),
  };

  const parseResult = listarAnexosSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos" };
  }

  const { solicitacaoId } = parseResult.data;

  const anexos = await db.query.anexo.findMany({
    where: (a, { eq }) => eq(a.solicitacaoId, solicitacaoId),
    orderBy: [sql`"criada_em" DESC`],
  });

  return { success: true, anexos };
}
