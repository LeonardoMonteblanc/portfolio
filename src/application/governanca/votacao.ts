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

const abrirVotacaoSchema = z.object({
  contestacaoId: z.string().uuid(),
  pergunta: z.string().min(5).max(1000),
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
    encerraEm: formData.get("encerraEm"),
  };

  const parseResult = abrirVotacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { contestacaoId, pergunta, encerraEm } = parseResult.data;

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

  // Quórum FIXO: admins ativos no momento da ABERTURA da votação
  const adminsAtivos = await db.query.administrador.findMany({
    where: (a, { eq }) => eq(a.ativo, true),
    columns: { id: true },
  });
  const adminIds = new Set(adminsAtivos.map((a) => a.id));

  if (adminIds.size === 0) {
    return { error: "Nenhum admin ativo para compor quórum" };
  }

  if (!adminIds.has(cont.autorId)) {
    return { error: "Autor da contestação não está no quórum" };
  }

  await db.transaction(async (tx) => {
    const [novaVotacao] = await tx
      .insert(votacaoTable)
      .values({
        contestacaoId,
        pergunta,
        tipo: "simples",
        quorumMinimo: adminIds.size,
        maioriaNecessaria: 50,
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
            { justificativa: "Votação iniciada" },
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

  revalidatePath("/admin/solicitacoes");
  revalidatePath(`/admin/negocios/${cont.negocioId}`);

  return { success: true };
}

const registrarVotoSchema = z.object({
  votacaoId: z.string().uuid(),
  escolha: z.enum(["aprovacao", "rejeicao"]),
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

  const vot = await db.query.votacao.findFirst({
    where: (v, { eq }) => eq(v.id, votacaoId),
    with: {
      contestacao: {
        with: {
          autor: { columns: { id: true, nome: true } },
          negocio: { columns: { id: true, nome: true, slug: true } },
          solicitacaoOrigem: {
            columns: { id: true, situacao: true, tipo: true },
          },
        },
      },
      votos: {
        with: {
          autor: { columns: { id: true, nome: true } },
        },
        orderBy: (v, { asc }) => [asc(v.criadoEm)],
      },
    },
  });

  if (!vot) {
    return { error: "Votação não encontrada" };
  }

  if (vot.situacao !== "em_andamento") {
    return { error: "Votação não está aberta para votação" };
  }

  if (new Date(vot.encerraEm) < new Date()) {
    return { error: "Prazo de votação encerrado" };
  }

  const adminIdsAtivos = new Set(
    (
      await db.query.administrador.findMany({
        where: (a, { eq }) => eq(a.ativo, true),
        columns: { id: true },
      })
    ).map((a) => a.id),
  );

  if (!adminIdsAtivos.has(admin.id)) {
    return { error: "Admin não está no quórum (não está ativo)" };
  }

  const votoExistente = await db.query.voto.findFirst({
    where: (v, { and }) =>
      and(eq(v.votacaoId, votacaoId), eq(v.adminId, admin.id)),
  });

  if (votoExistente) {
    return { error: "Você já votou nesta votação" };
  }

  const votosExistentes = await db.query.voto.findMany({
    where: (v, { eq }) => eq(v.votacaoId, votacaoId),
  });

  const votosInfo = votosExistentes.map((v) => ({
    adminId: v.adminId,
    escolha: v.escolha as "aprovacao" | "rejeicao",
    estado: "ativo" as const,
    criadoEm: v.criadoEm,
  }));

  const votosParaValidacao = [
    ...votosInfo,
    {
      adminId: admin.id,
      escolha,
      estado: "ativo" as const,
      criadoEm: new Date(),
    },
  ];

  try {
    transicionarVotacao("em_andamento", "REGISTRAR_VOTO", {
      votos: votosParaValidacao,
      adminsAtivos: adminIdsAtivos,
      adminId: admin.id,
      escolha,
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
      escolha,
    });

    const votosSim =
      votosExistentes.filter((v) => v.escolha === "aprovacao").length +
      (escolha === "aprovacao" ? 1 : 0);
    const votosNao =
      votosExistentes.filter((v) => v.escolha === "rejeicao").length +
      (escolha === "rejeicao" ? 1 : 0);

    await tx
      .update(votacaoTable)
      .set({
        totalVotos: votosExistentes.length + 1,
        votosSim,
        votosNao,
      })
      .where(eq(votacaoTable.id, votacaoId));

    await tx.insert(logVotacao).values({
      atorTipo: "admin",
      atorId: admin.id,
      votacaoId,
      acao: "votar",
      situacaoAnterior: "em_andamento",
      situacaoNova: "em_andamento",
    } satisfies typeof logVotacao.$inferInsert);
  });

  revalidatePath("/admin/solicitacoes");
  if (vot.contestacao) {
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

  const vot = await db.query.votacao.findFirst({
    where: (v, { eq }) => eq(v.id, votacaoId),
    with: {
      contestacao: {
        with: {
          autor: { columns: { id: true, nome: true } },
          negocio: { columns: { id: true, nome: true, slug: true } },
          solicitacaoOrigem: {
            columns: { id: true, situacao: true, tipo: true },
          },
        },
      },
      votos: {
        with: {
          autor: { columns: { id: true, nome: true } },
        },
        orderBy: (v, { asc }) => [asc(v.criadoEm)],
      },
    },
  });

  if (!vot) {
    return { error: "Votação não encontrada" };
  }

  if (vot.situacao !== "em_andamento") {
    return { error: "Votação não está em andamento" };
  }

  const adminIdsAtivos = new Set(
    (
      await db.query.administrador.findMany({
        where: (a, { eq }) => eq(a.ativo, true),
        columns: { id: true },
      })
    ).map((a) => a.id),
  );

  const votosExistentes = await db.query.voto.findMany({
    where: (v, { eq }) => eq(v.votacaoId, votacaoId),
  });

  const votosInfo = votosExistentes.map((v) => ({
    adminId: v.adminId,
    escolha: v.escolha as "aprovacao" | "rejeicao",
    estado: "ativo" as const,
    criadoEm: v.criadoEm,
  }));

  try {
    const novaSituacaoDomain = transicionarVotacao(
      "em_andamento",
      "CONCLUIR_VOTACAO",
      {
        votos: votosInfo,
        adminsAtivos: adminIdsAtivos,
      },
    ) as "aprovada" | "rejeitada" | "sem_aprovacao";

    const apuracao = apurarVotacao(votosInfo, adminIdsAtivos);

    if (!apuracao.quorumCompleto) {
      return { error: "Quórum incompleto: nem todos os admins ativos votaram" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(votacaoTable)
        .set({
          situacao: novaSituacaoDomain,
          encerradaEm: new Date(),
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
        situacaoNova: novaSituacaoDomain,
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
              const novaSituacao = transicionarSolicitacao(
                sol.situacao as any,
                "CONCLUIR_VOTACAO",
                {
                  resultadoVotacao: apuracao.situacao as
                    "aprovada" | "rejeitada" | "sem_aprovacao",
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

    revalidatePath("/admin/solicitacoes");
    if (vot.contestacao) {
      revalidatePath(`/admin/negocios/${vot.contestacao.negocioId}`);
    }

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

  const vot = await db.query.votacao.findFirst({
    where: (v, { eq }) => eq(v.id, votacaoId),
    with: {
      contestacao: {
        with: {
          autor: { columns: { id: true, nome: true } },
          negocio: { columns: { id: true, nome: true, slug: true } },
          solicitacaoOrigem: {
            columns: { id: true, situacao: true, tipo: true },
          },
        },
      },
      votos: {
        with: {
          autor: { columns: { id: true, nome: true } },
        },
        orderBy: (v, { asc }) => [asc(v.criadoEm)],
      },
    },
  });

  if (!vot) {
    return { error: "Votação não encontrada" };
  }

  const adminsAtivos = await db.query.administrador.findMany({
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
      situacaoDomain: vot.situacao,
    },
    adminsAtivos,
    naoVotaram,
  };
}
