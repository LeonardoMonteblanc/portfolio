// src/application/solicitacoes/analise.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  solicitacao,
  negocio,
  solicitante,
  contato,
  localizacao,
  horarioFuncionamento,
  negocioCategoria,
} from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import {
  logSolicitacaoAnalisada,
  logVinculacaoSolicitacao,
  logNegocio,
  logComunicacao,
} from "@/infrastructure/db/schema/logs";
import { enviarEmailAnaliseSolicitacao } from "@/infrastructure/email/client";
import { revalidatePath } from "next/cache";

const analisarSolicitacaoSchema = z.object({
  solicitacaoId: z.string().uuid(),
  decisao: z.enum(["aprovar", "reprovar", "solicitar_correcao"]),
  justificativa: z.string().optional(),
  observacoesInternas: z.string().optional(),
});

export async function analisarSolicitacaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    solicitacaoId: formData.get("solicitacaoId"),
    decisao: formData.get("decisao"),
    justificativa: formData.get("justificativa") || undefined,
    observacoesInternas: formData.get("observacoesInternas") || undefined,
  };

  const parseResult = analisarSolicitacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { solicitacaoId, decisao, justificativa, observacoesInternas } =
    parseResult.data;

  const sol = (await db.query.solicitacao.findFirst({
    where: (s, { eq }) => eq(s.id, solicitacaoId),
    with: {
      solicitante: true,
      sugestaoCategoria: true,
    },
  })) as any;

  if (!sol) {
    return { error: "Solicitação não encontrada" };
  }

  if (sol.situacao !== "recebida" && sol.situacao !== "em_fila_contestacao") {
    return { error: "Solicitação não pode ser analisada no estado atual" };
  }

  let resultado: { situacao: string; negocioId?: string } = { situacao: "" };

  await db.transaction(async (tx) => {
    if (decisao === "aprovar") {
      // Criar negócio a partir dos dados propostos
      const dados = sol.dadosNegocioProposto as Record<string, unknown>;

      const [novoNegocio] = await tx
        .insert(negocio)
        .values({
          slug: dados.nome
            ? (dados.nome as string)
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
            : "sem-nome",
          nome: dados.nome as string,
          descricao: dados.descricao as string,
          situacaoPublicacao: "publicado",
          fonte: "solicitacao_publica",
          solicitacaoOrigemId: sol.id,
        })
        .returning();

      if (!novoNegocio) throw new Error("Falha ao criar negócio");

      // Criar contatos
      const contatosData =
        (dados.contatos as Array<{
          tipo: string;
          valor: string;
          ordem: number;
        }>) || [];
      for (const c of contatosData) {
        await tx.insert(contato).values({
          negocioId: novoNegocio.id,
          tipo: c.tipo,
          valor: c.valor,
          ordem: c.ordem,
        });
      }

      // Criar localização se houver
      if (dados.localizacao) {
        const loc = dados.localizacao as Record<string, string>;
        await tx.insert(localizacao).values({
          negocioId: novoNegocio.id,
          endereco: loc.endereco,
          bairro: loc.bairro,
          areaAtendimento: loc.areaAtendimento,
        });
      }

      // Criar horários se houver
      const horariosData =
        (dados.horarios as Array<{
          diaSemana: number;
          horaAbertura: string;
          horaFechamento: string;
          observacao?: string;
        }>) || [];
      for (const h of horariosData) {
        await tx.insert(horarioFuncionamento).values({
          negocioId: novoNegocio.id,
          diaSemana: h.diaSemana,
          horaAbertura: h.horaAbertura,
          horaFechamento: h.horaFechamento,
          observacao: h.observacao,
        });
      }

      // Vincular categorias
      const categoriasIds = (dados.categoriasIds as string[]) || [];
      for (const catId of categoriasIds) {
        await tx.insert(negocioCategoria).values({
          negocioId: novoNegocio.id,
          categoriaId: catId,
        });
      }

      // Processar sugestão de categoria se houver
      if (sol.sugestaoCategoria && sol.sugestaoCategoria.length > 0) {
        const sug = sol.sugestaoCategoria[0];
        if (sug.situacao === "aceita" && sug.categoriaCriadaId) {
          await tx.insert(negocioCategoria).values({
            negocioId: novoNegocio.id,
            categoriaId: sug.categoriaCriadaId,
          });
        }
      }

      // Atualizar solicitação
      await tx
        .update(solicitacao)
        .set({
          situacao: "aprovada",
          negocioId: novoNegocio.id,
          analisadaEm: new Date(),
          observacoesInternas,
        })
        .where(eq(solicitacao.id, solicitacaoId));

      resultado = { situacao: "aprovada", negocioId: novoNegocio.id };

      // Log de auditoria
      await tx.insert(logSolicitacaoAnalisada).values({
        atorTipo: "admin",
        solicitacaoId,
        decisao: "aprovar",
        justificativa,
        negocioId: novoNegocio.id,
      });

      await tx.insert(logVinculacaoSolicitacao).values({
        atorTipo: "sistema",
        solicitacaoId,
        negocioIdDepois: novoNegocio.id,
      });

      await tx.insert(logNegocio).values({
        atorTipo: "sistema",
        negocioId: novoNegocio.id,
        acao: "criar_via_solicitacao",
        snapshotAntes: null,
        snapshotDepois: JSON.stringify(dados),
      });
    } else if (decisao === "reprovar") {
      await tx
        .update(solicitacao)
        .set({
          situacao: "reprovada",
          analisadaEm: new Date(),
          observacoesInternas,
        })
        .where(eq(solicitacao.id, solicitacaoId));

      resultado = { situacao: "reprovada" };

      // Log de auditoria
      await tx.insert(logSolicitacaoAnalisada).values({
        atorTipo: "admin",
        solicitacaoId,
        decisao: "reprovar",
        justificativa,
      });
    } else if (decisao === "solicitar_correcao") {
      await tx
        .update(solicitacao)
        .set({
          situacao: "incompleta",
          motivoIncompleta: justificativa,
          analisadaEm: new Date(),
          observacoesInternas,
        })
        .where(eq(solicitacao.id, solicitacaoId));

      resultado = { situacao: "incompleta" };

      // Log de auditoria
      await tx.insert(logSolicitacaoAnalisada).values({
        atorTipo: "admin",
        solicitacaoId,
        decisao: "solicitar_correcao",
        justificativa,
      });
    }
  });

  // Enviar e-mail transacional
  if (sol.solicitante) {
    const nomeNegocio = (sol.dadosNegocioProposto as Record<string, unknown>)
      .nome as string;
    await enviarEmailAnaliseSolicitacao(
      sol.solicitante.email,
      sol.solicitante.nome,
      nomeNegocio,
      decisao,
      justificativa,
    ).catch(console.error);

    // Log de comunicação
    await db.insert(logComunicacao).values({
      atorTipo: "sistema",
      tipo: "analise_solicitacao",
      destinatario: sol.solicitante.email,
      sucesso: true,
    });
  }

  revalidatePath("/admin/solicitacoes");

  return {
    success: true,
    situacao: resultado?.situacao,
    negocioId: resultado?.negocioId,
  };
}
