// src/application/governanca/contestacao.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  contestacao,
  negocio,
  solicitacao,
  administrador,
} from "@/infrastructure/db/schema";
import {
  logContestacao,
  logSolicitacaoAnalisada,
  logNegocio,
} from "@/infrastructure/db/schema/logs";
import { eq, and, desc } from "drizzle-orm";
import {
  transicionarSolicitacao,
  transicionarPublicacao,
  podeContestar,
} from "@/domain/state-machines";
import {
  ErroTransicaoInvalida,
  JustificativaObrigatoria,
  ReaberturaNaoPermitida,
  DecisaoImutavel,
} from "@/domain/errors";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";
import { appendLog } from "@/infrastructure/audit/audit.service";
import { contextoDaRequisicao } from "@/lib/audit-context";

const abrirContestacaoSchema = z.object({
  negocioId: z.string().uuid(),
  solicitacaoId: z.string().uuid().optional(),
  fundamentacao: z.string().min(10).max(5000),
  tipo: z.enum(["oficial", "manifesta"]), // 'oficial' = contestação formal que abre votação, 'manifesta' = apenas concordância/discordância
});

export async function abrirContestacaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    negocioId: formData.get("negocioId"),
    solicitacaoId: formData.get("solicitacaoId") || undefined,
    fundamentacao: formData.get("fundamentacao"),
    tipo: formData.get("tipo"),
  };

  const parseResult = abrirContestacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { negocioId, solicitacaoId, fundamentacao, tipo } = parseResult.data;

  // Verificar se o negócio existe
  const neg = await db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.id, negocioId),
    with: {
      solicitacaoOrigem: {
        columns: { id: true, situacao: true, origemDecisao: true },
      },
    },
  });

  if (!neg) {
    return { error: "Negócio não encontrado" };
  }

  // Para contestação oficial, precisa de uma solicitação origem com decisão individual
  if (tipo === "oficial") {
    if (!solicitacaoId) {
      return { error: "Contestação oficial requer ID da solicitação original" };
    }

    const sol = await db.query.solicitacao.findFirst({
      where: (s, { eq }) => eq(s.id, solicitacaoId),
    });

    if (!sol) {
      return { error: "Solicitação não encontrada" };
    }

    // Verificar se pode ser contestada (RN24: decisão de votação não pode ser recontestada)
    if (
      !sol.origemDecisao ||
      !podeContestar(
        sol.situacao as any,
        sol.origemDecisao as "votacao" | "individual",
      )
    ) {
      return { error: "Esta solicitação não pode ser contestada" };
    }

    // Verificar se o negócio está publicado (aprovado)
    if (sol.situacao !== "aprovada" && sol.situacao !== "rejeitada") {
      return {
        error: "Só é possível contestar decisões de aprovação ou rejeição",
      };
    }
  }

  await db.transaction(async (tx) => {
    // Criar contestação
    const [novaContestacao] = await tx
      .insert(contestacao)
      .values({
        negocioId,
        solicitacaoOrigemId: solicitacaoId,
        autorId: admin.id,
        tipo,
        fundamentacao,
        situacao: tipo === "oficial" ? "aberta" : "encerrada",
      })
      .returning();

    if (!novaContestacao) {
      throw new Error("Falha ao criar contestação");
    }

    // Log de auditoria
    await tx.insert(logContestacao).values({
      atorTipo: "admin" as const,
      atorId: admin.id,
      contestacaoId: novaContestacao.id,
      acao: "criar" as const,
      situacaoNova: novaContestacao.situacao,
    } satisfies typeof logContestacao.$inferInsert);

    await appendLog(
      {
        ...(await contextoDaRequisicao("admin", admin.id)),
        acao: "abrir_contestacao",
        entidadeTipo: "contestacao",
        entidadeId: novaContestacao.id,
        detalhes: { tipo, negocioId, solicitacaoId: solicitacaoId ?? null },
        snapshotDepois: { situacao: novaContestacao.situacao },
      },
      tx,
    );

    // Se for contestação oficial de aprovação, ocultar negócio do catálogo
    if (tipo === "oficial" && neg.situacaoPublicacao === "publicado") {
      await tx
        .update(negocio)
        .set({ situacaoPublicacao: "oculto_contestacao" })
        .where(eq(negocio.id, negocioId));

      await tx.insert(logNegocio).values({
        atorTipo: "admin" as const,
        atorId: admin.id,
        negocioId,
        acao: "ocultar_por_contestacao" as const,
        snapshotAntes: JSON.stringify({ situacaoPublicacao: "publicado" }),
        snapshotDepois: JSON.stringify({
          situacaoPublicacao: "oculto_contestacao",
        }),
      } satisfies typeof logNegocio.$inferInsert);
    }

    // Se houver solicitação origem, atualizar estado da solicitação
    if (solicitacaoId) {
      try {
        const sol = await tx.query.solicitacao.findFirst({
          where: (s, { eq }) => eq(s.id, solicitacaoId),
        });

        if (sol) {
          const novaSituacao = transicionarSolicitacao(
            sol.situacao as any,
            "ABRIR_CONTESTACAO",
            {
              justificativa: fundamentacao,
            },
          );

          await tx
            .update(solicitacao)
            .set({ situacao: novaSituacao })
            .where(eq(solicitacao.id, solicitacaoId));

          await tx.insert(logSolicitacaoAnalisada).values({
            atorTipo: "admin" as const,
            atorId: admin.id,
            solicitacaoId,
            decisao: "contestar" as const,
            justificativa: fundamentacao,
          } satisfies typeof logSolicitacaoAnalisada.$inferInsert);
        }
      } catch (e) {
        if (e instanceof ErroTransicaoInvalida) {
          // Ignorar erro de transição - a contestação foi criada mesmo assim
        } else {
          throw e;
        }
      }
    }
  });

  revalidatePath(`/admin/solicitacoes`);
  revalidatePath(`/admin/negocios/${negocioId}`);

  return { success: true };
}

const listarContestacoesSchema = z.object({
  negocioId: z.string().uuid(),
});

export async function listarContestacoesAction(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: true; contestacoes: any[] } | { error: string }> {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    negocioId: formData.get("negocioId"),
  };

  const parseResult = listarContestacoesSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos" };
  }

  const { negocioId } = parseResult.data;

  const contestacoes = await db.query.contestacao.findMany({
    where: (c, { eq }) => eq(c.negocioId, negocioId),
    orderBy: (c, { desc }) => [desc(c.criadaEm)],
    with: {
      autor: { columns: { id: true, nome: true } },
      votacao: true,
    },
  });

  return { success: true, contestacoes };
}
