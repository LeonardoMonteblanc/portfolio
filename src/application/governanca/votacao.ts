// src/application/governanca/votacao.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  votacao as votacaoTable,
  voto as votoTable,
  contestacao as contestacaoTable,
  administrador as administradorTable,
  negocio as negocioTable,
  solicitacao as solicitacaoTable,
} from "@/infrastructure/db/schema";
import {
  logVotacao,
  logContestacao,
  logSolicitacaoAnalisada,
  logNegocio,
} from "@/infrastructure/db/schema/logs";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  transicionarVotacao,
  transicionarSolicitacao,
  transicionarPublicacao,
  apurarVotacao,
} from "@/domain/state-machines";
import {
  ErroTransicaoInvalida,
  VotoDuplicado,
  QuorumIncompleto,
  JustificativaObrigatoria,
} from "@/domain/errors";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";

// Tipos para queries com relations
type VotacaoWithRelations = {
  id: string;
  situacao: string;
  encerraEm: Date;
  contestacaoId: string;
  contestacao: {
    id: string;
    situacao: string;
    negocioId: string;
    solicitacaoOrigemId: string | null;
    negocio: { id: string; situacaoPublicacao: string };
    solicitacaoOrigem: {
      id: string;
      situacao: string;
      origemDecisao: string | null;
    } | null;
  } | null;
  votos: Array<{
    id: string;
    votacaoId: string;
    adminId: string;
    valor: string;
    criadoEm: Date;
    admin: { id: string; nome: string } | null;
  }> | null;
};

type VotoWithAdmin = {
  id: string;
  votacaoId: string;
  adminId: string;
  valor: string;
  criadoEm: Date;
  admin: { id: string; nome: string } | null;
};

type ContestacaoWithRelations = {
  id: string;
  situacao: string;
  negocioId: string;
  solicitacaoOrigemId: string | null;
  autorId: string;
  negocio: { id: string; situacaoPublicacao: string };
  solicitacaoOrigem: {
    id: string;
    situacao: string;
    origemDecisao: string | null;
  } | null;
};

// Mapeamento entre schema do banco e domínio
const mapSituacaoVotacaoToDomain = (
  s: string,
): "em_andamento" | "aprovada" | "rejeitada" | "sem_aprovacao" => {
  switch (s) {
    case "aberta":
    case "em_andamento":
      return "em_andamento";
    case "aprovada":
      return "aprovada";
    case "rejeitada":
      return "rejeitada";
    case "sem_aprovacao":
      return "sem_aprovacao";
    case "encerrada":
    case "cancelada":
    default:
      return "sem_aprovacao";
  }
};

const mapSituacaoVotacaoToDb = (
  s: "em_andamento" | "aprovada" | "rejeitada" | "sem_aprovacao",
): string => {
  switch (s) {
    case "em_andamento":
      return "aberta";
    case "aprovada":
      return "aprovada";
    case "rejeitada":
      return "rejeitada";
    case "sem_aprovacao":
      return "sem_aprovacao";
  }
};

const mapEscolhaToDomain = (v: string): "aprovacao" | "rejeicao" => {
  if (v === "sim") return "aprovacao";
  if (v === "nao") return "rejeicao";
  return "aprovacao";
};

const mapEscolhaToDb = (e: "aprovacao" | "rejeicao"): "sim" | "nao" => {
  return e === "aprovacao" ? "sim" : "nao";
};

const abrirVotacaoSchema = z.object({
  contestacaoId: z.string().uuid(),
  pergunta: z.string().min(5).max(1000),
  tipo: z.enum(["simples", "qualificada"]),
  quorumMinimo: z.number().int().min(1),
  maioriaNecessaria: z.number().int().min(50).max(100),
  encerraEm: z.string().datetime(),
});

export async function abrirVotacaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    contestacaoId: formData.get("contestacaoId"),
    pergunta: formData.get("pergunta"),
    tipo: formData.get("tipo"),
    quorumMinimo: parseInt(formData.get("quorumMinimo") as string, 10),
    maioriaNecessaria: parseInt(
      formData.get("maioriaNecessaria") as string,
      10,
    ),
    encerraEm: formData.get("encerraEm"),
  };

  const parseResult = abrirVotacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const {
    contestacaoId,
    pergunta,
    tipo,
    quorumMinimo,
    maioriaNecessaria,
    encerraEm,
  } = parseResult.data;

  const cont = await db.query.contestacao.findFirst({
    where: (c, { eq }) => eq(c.id, contestacaoId),
    with: {
      negocio: true,
      solicitacaoOrigem: true,
    },
  });

  if (!cont) {
    return { error: "Contestação não encontrada" };
  }

  if (cont.situacao !== "aberta") {
    return { error: "Contestação já possui votação ou está encerrada" };
  }

  const adminsAtivos = await db.query.administrador.findMany({
    // @ts-ignore
    // @ts-ignore
    where: (a, { eq }) => eq(a.ativo, true),
    columns: { id: true },
  });

  const adminIds = new Set(adminsAtivos.map((a) => a.id));

  if (!adminIds.has(cont.autorId)) {
    return { error: "Autor da contestação não está no quórum" };
  }

  await db.transaction(async (tx) => {
    const [novaVotacao] = await tx
      .insert(votacaoTable)
      .values({
        contestacaoId,
        pergunta,
        tipo,
        quorumMinimo: adminIds.size,
        maioriaNecessaria,
        situacao: "em_andamento",
        encerraEm: new Date(encerraEm),
      })
      .returning();

    if (!novaVotacao) {
      throw new Error("Falha ao criar votação");
    }

    await tx
      .update(contestacaoTable)
      .set({
        situacao: "em_votacao",
        votacaoId: novaVotacao.id,
      })
      .where(eq(contestacaoTable.id, contestacaoId));

    await tx.insert(logVotacao).values({
      atorTipo: "admin",
      atorId: admin.id,
      votacaoId: novaVotacao.id,
      acao: "iniciar",
      situacaoNova: "em_andamento",
    } satisfies typeof logVotacao.$inferInsert);

    await tx.insert(logContestacao).values({
      atorTipo: "admin",
      atorId: admin.id,
      contestacaoId,
      acao: "iniciar_votacao",
      situacaoAnterior: "aberta",
      situacaoNova: "em_votacao",
    } satisfies typeof logContestacao.$inferInsert);

    if (cont.solicitacaoOrigemId) {
      const sol = await tx.query.solicitacao.findFirst({
        where: (s, { eq }) => eq(s.id, cont.solicitacaoOrigemId!),
      });

      if (sol) {
        try {
          const novaSituacao = transicionarSolicitacao(
            sol.situacao as any,
            "ABRIR_CONTESTACAO",
            {
              justificativa: "Votação iniciada",
            },
          );

          await tx
            .update(solicitacaoTable)
            .set({ situacao: novaSituacao })
            .where(eq(solicitacaoTable.id, cont.solicitacaoOrigemId!));

          await tx.insert(logSolicitacaoAnalisada).values({
            atorTipo: "admin",
            atorId: admin.id,
            solicitacaoId: cont.solicitacaoOrigemId!,
            decisao: "abrir_votacao",
          } satisfies typeof logSolicitacaoAnalisada.$inferInsert);
        } catch (e) {
          if (!(e instanceof ErroTransicaoInvalida)) throw e;
        }
      }
    }

    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    if (cont.negocio.situacaoPublicacao === "publicado") {
      await tx
        .update(negocioTable)
        .set({ situacaoPublicacao: "oculto_contestacao" })
        .where(eq(negocioTable.id, cont.negocioId));

      await tx.insert(logNegocio).values({
        atorTipo: "sistema",
        negocioId: cont.negocioId,
        acao: "ocultar_por_contestacao",
        snapshotAntes: JSON.stringify({ situacaoPublicacao: "publicado" }),
        snapshotDepois: JSON.stringify({
          situacaoPublicacao: "oculto_contestacao",
        }),
      } satisfies typeof logNegocio.$inferInsert);
    }
  });

  revalidatePath(`/admin/solicitacoes`);
  revalidatePath(`/admin/negocios/${cont.negocioId}`);

  return { success: true };
}

const registrarVotoSchema = z.object({
  votacaoId: z.string().uuid(),
  escolha: z.enum(["sim", "nao", "abstencao"]),
});

export async function registrarVotoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    votacaoId: formData.get("votacaoId"),
    escolha: formData.get("escolha"),
  };

  const parseResult = registrarVotoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { votacaoId, escolha } = parseResult.data;

  const votacaoQuery = {
    // @ts-ignore
    // @ts-ignore
    where: (v, { eq }) => eq(v.id, votacaoId),
    with: {
      contestacao: {
        with: {
          autor: { columns: { id: true, nome: true } },
          negocio: true,
          solicitacaoOrigem: true,
        },
      },
      votos: {
        with: {
          admin: { columns: { id: true, nome: true } },
        },
        // @ts-ignore
        // @ts-ignore
        orderBy: (v, { asc }) => [asc(v.criadoEm)],
      },
    },
  };

  const vot = await db.query.votacao.findFirst(votacaoQuery);

  if (!vot) {
    return { error: "Votação não encontrada" };
  }

  const situacaoDomain = mapSituacaoVotacaoToDomain(vot.situacao);
  if (situacaoDomain !== "em_andamento") {
    return { error: "Votação não está aberta para votação" };
  }

  if (new Date(vot.encerraEm) < new Date()) {
    return { error: "Prazo de votação encerrado" };
  }

  const adminsAtivos = await db.query.administrador.findMany({
    // @ts-ignore
    // @ts-ignore
    where: (a, { eq }) => eq(a.ativo, true),
    columns: { id: true },
  });
  const adminIdsAtivos = new Set(adminsAtivos.map((a) => a.id));

  if (!adminIdsAtivos.has(admin.id)) {
    return { error: "Admin não está no quórum (não está ativo)" };
  }

  const votosExistentes = await db.query.voto.findMany({
    where: (v, { eq }) => eq(v.votacaoId, votacaoId),
  });

  const votosInfo = votosExistentes.map((v) => ({
    adminId: v.adminId,
    escolha: (v.valor === "sim"
      ? "aprovacao"
      : v.valor === "nao"
        ? "rejeicao"
        : "aprovacao") as "aprovacao" | "rejeicao",
    estado: "ativo" as const,
    criadoEm: v.criadoEm,
  }));

  try {
    transicionarVotacao(situacaoDomain, "REGISTRAR_VOTO", {
      votos: votosInfo,
      adminsAtivos: adminIdsAtivos,
      adminId: admin.id,
      escolha:
        escolha === "abstencao" ? undefined : mapEscolhaToDomain(escolha),
    });
  } catch (e) {
    if (e instanceof VotoDuplicado) {
      return { error: "Você já votou nesta votação" };
    }
    if (e instanceof ErroTransicaoInvalida) {
      return { error: "Não é possível votar no momento" };
    }
    throw e;
  }

  await db.transaction(async (tx) => {
    await tx.insert(votoTable).values({
      votacaoId,
      adminId: admin.id,
      valor: escolha,
    });

    const votosSim =
      votosExistentes.filter((v) => v.valor === "sim").length +
      (escolha === "sim" ? 1 : 0);
    const votosNao =
      votosExistentes.filter((v) => v.valor === "nao").length +
      (escolha === "nao" ? 1 : 0);
    const votosAbstencao =
      votosExistentes.filter((v) => v.valor === "abstencao").length +
      (escolha === "abstencao" ? 1 : 0);

    await tx
      .update(votacaoTable)
      .set({
        totalVotos: votosExistentes.length + 1,
        votosSim,
        votosNao,
        votosAbstencao,
      })
      .where(eq(votacaoTable.id, votacaoId));

    await tx.insert(logVotacao).values({
      atorTipo: "admin",
      atorId: admin.id,
      votacaoId,
      acao: "votar",
      situacaoAnterior: vot.situacao,
      situacaoNova: vot.situacao,
    } satisfies typeof logVotacao.$inferInsert);
  });

  revalidatePath(`/admin/solicitacoes`);
  // @ts-ignore
  if (vot.contestacao) {
    // @ts-ignore
    revalidatePath(`/admin/negocios/${vot.contestacao.negocioId}`);
  }

  return { success: true };
}

const apurarVotacaoSchema = z.object({
  votacaoId: z.string().uuid(),
});

export async function apurarVotacaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    votacaoId: formData.get("votacaoId"),
  };

  const parseResult = apurarVotacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos" };
  }

  const { votacaoId } = parseResult.data;

  const votacaoQuery = {
    // @ts-ignore
    // @ts-ignore
    where: (v, { eq }) => eq(v.id, votacaoId),
    with: {
      contestacao: {
        with: {
          autor: { columns: { id: true, nome: true } },
          negocio: true,
          solicitacaoOrigem: true,
        },
      },
      votos: {
        with: {
          admin: { columns: { id: true, nome: true } },
        },
        // @ts-ignore
        // @ts-ignore
        orderBy: (v, { asc }) => [asc(v.criadoEm)],
      },
    },
  };

  // @ts-ignore
  const vot: VotacaoWithRelations | null =
    await db.query.votacao.findFirst(votacaoQuery);

  if (!vot) {
    return { error: "Votação não encontrada" };
  }

  const situacaoDomain = mapSituacaoVotacaoToDomain(vot.situacao);
  if (situacaoDomain !== "em_andamento") {
    return { error: "Votação não está em andamento" };
  }

  const adminsAtivos = await db.query.administrador.findMany({
    // @ts-ignore
    // @ts-ignore
    where: (a, { eq }) => eq(a.ativo, true),
    columns: { id: true },
  });
  const adminIdsAtivos = new Set(adminsAtivos.map((a) => a.id));

  const votosExistentes = await db.query.voto.findMany({
    where: (v, { eq }) => eq(v.votacaoId, votacaoId),
  });

  const votosInfo = votosExistentes.map((v) => ({
    adminId: v.adminId,
    escolha: (v.valor === "sim"
      ? "aprovacao"
      : v.valor === "nao"
        ? "rejeicao"
        : "aprovacao") as "aprovacao" | "rejeicao",
    estado: "ativo" as const,
    criadoEm: v.criadoEm,
  }));

  try {
    const novaSituacaoDomain = transicionarVotacao(
      situacaoDomain,
      "CONCLUIR_VOTACAO",
      {
        votos: votosInfo,
        adminsAtivos: adminIdsAtivos,
      },
    );

    const apuracao = apurarVotacao(votosInfo, adminIdsAtivos);

    await db.transaction(async (tx) => {
      const novaSituacaoDb = mapSituacaoVotacaoToDb(novaSituacaoDomain);

      await tx
        .update(votacaoTable)
        .set({
          situacao: novaSituacaoDb,
          encerradaEm: new Date(),
          // @ts-ignore
          resultado: apuracao.situacao,
          totalVotos: apuracao.aprovacoes + apuracao.rejeicoes,
          votosSim: apuracao.aprovacoes,
          votosNao: apuracao.rejeicoes,
        })
        .where(eq(votacaoTable.id, votacaoId));

      await tx
        .update(contestacaoTable)
        .set({
          situacao: "encerrada",
          decididaEm: new Date(),
        })
        .where(eq(contestacaoTable.id, vot.contestacaoId));

      await tx.insert(logVotacao).values({
        atorTipo: "admin",
        atorId: admin.id,
        votacaoId,
        acao: "apurar",
        situacaoAnterior: "em_andamento",
        situacaoNova: novaSituacaoDb,
        // @ts-ignore
        resultado: apuracao.situacao,
        totalVotos: apuracao.aprovacoes + apuracao.rejeicoes,
      } satisfies typeof logVotacao.$inferInsert);

      await tx.insert(logContestacao).values({
        atorTipo: "admin",
        atorId: admin.id,
        contestacaoId: vot.contestacaoId,
        acao: "encerrar",
        situacaoAnterior: "em_votacao",
        situacaoNova: "encerrada",
      } satisfies typeof logContestacao.$inferInsert);

      const contestacao = vot.contestacao;
      if (contestacao) {
        if (contestacao.solicitacaoOrigemId) {
          const sol = await tx.query.solicitacao.findFirst({
            where: (s, { eq }) => eq(s.id, contestacao.solicitacaoOrigemId!),
          });

          if (sol) {
            try {
              // @ts-ignore
              // @ts-ignore
              // @ts-ignore
              // @ts-ignore
              // @ts-ignore
              const novaSituacao = transicionarSolicitacao(
                sol.situacao as any,
                "CONCLUIR_VOTACAO",
                {
                  // @ts-ignore
                  resultadoVotacao: apuracao.situacao,
                },
              );

              await tx
                .update(solicitacaoTable)
                .set({ situacao: novaSituacao })
                .where(
                  eq(solicitacaoTable.id, contestacao.solicitacaoOrigemId!),
                );

              await tx.insert(logSolicitacaoAnalisada).values({
                atorTipo: "sistema",
                solicitacaoId: contestacao.solicitacaoOrigemId!,
                decisao: `votacao_${apuracao.situacao}`,
                justificativa: `Votação concluída: ${apuracao.aprovacoes} a favor, ${apuracao.rejeicoes} contra`,
              } satisfies typeof logSolicitacaoAnalisada.$inferInsert);
            } catch (e) {
              if (!(e instanceof ErroTransicaoInvalida)) throw e;
            }
          }

          if (apuracao.situacao === "aprovada") {
            await tx
              .update(negocioTable)
              .set({ situacaoPublicacao: "publicado" })
              .where(eq(negocioTable.id, contestacao.negocioId));

            await tx.insert(logNegocio).values({
              atorTipo: "sistema",
              negocioId: contestacao.negocioId,
              acao: "votacao_aprovada",
              snapshotAntes: JSON.stringify({
                situacaoPublicacao: "oculto_contestacao",
              }),
              snapshotDepois: JSON.stringify({
                situacaoPublicacao: "publicado",
              }),
            } satisfies typeof logNegocio.$inferInsert);
          } else {
            await tx
              .update(negocioTable)
              .set({ situacaoPublicacao: "nao_publicado" })
              .where(eq(negocioTable.id, contestacao.negocioId));

            await tx.insert(logNegocio).values({
              atorTipo: "sistema",
              negocioId: contestacao.negocioId,
              acao: "votacao_rejeitada_ou_empate",
              snapshotAntes: JSON.stringify({
                situacaoPublicacao: "oculto_contestacao",
              }),
              snapshotDepois: JSON.stringify({
                situacaoPublicacao: "nao_publicado",
              }),
            } satisfies typeof logNegocio.$inferInsert);
          }
        }
      }
    });

    revalidatePath(`/admin/solicitacoes`);
    // @ts-ignore
    if (vot.contestacao) {
      // @ts-ignore
      revalidatePath(`/admin/negocios/${vot.contestacao.negocioId}`);
    }

    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    return { success: true, resultado: apuracao.situacao };
  } catch (e) {
    if (e instanceof QuorumIncompleto) {
      return { error: "Quórum incompleto: nem todos os admins ativos votaram" };
    }
    throw e;
  }
}

const detalharVotacaoSchema = z.object({
  votacaoId: z.string().uuid(),
});

export async function detalharVotacaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    votacaoId: formData.get("votacaoId"),
  };

  const parseResult = detalharVotacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "Dados inválidos" };
  }

  const { votacaoId } = parseResult.data;

  const votacaoQuery = {
    // @ts-ignore
    // @ts-ignore
    where: (v, { eq }) => eq(v.id, votacaoId),
    with: {
      contestacao: {
        with: {
          autor: { columns: { id: true, nome: true } },
          negocio: true,
          solicitacaoOrigem: true,
        },
      },
      votos: {
        with: {
          admin: { columns: { id: true, nome: true } },
        },
        // @ts-ignore
        // @ts-ignore
        orderBy: (v, { asc }) => [asc(v.criadoEm)],
      },
    },
  };

  // @ts-ignore
  const vot: VotacaoWithRelations | null =
    await db.query.votacao.findFirst(votacaoQuery);

  if (!vot) {
    return { error: "Votação não encontrada" };
  }

  const adminsAtivos = await db.query.administrador.findMany({
    // @ts-ignore
    // @ts-ignore
    where: (a, { eq }) => eq(a.ativo, true),
    columns: { id: true, nome: true },
  });

  const votaram = new Set(
    vot.votos!.map((v: { adminId: string }) => v.adminId),
  );
  const naoVotaram = adminsAtivos.filter(
    (a: { id: string }) => !votaram.has(a.id),
  );

  return {
    success: true,
    votacao: {
      ...vot,
      situacaoDomain: mapSituacaoVotacaoToDomain(vot.situacao),
    },
    adminsAtivos,
    naoVotaram,
  };
}
