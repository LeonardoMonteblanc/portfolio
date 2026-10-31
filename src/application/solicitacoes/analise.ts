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
import { appendLog } from "@/infrastructure/audit/audit.service";
import { exigirContextoAdmin } from "@/lib/audit-context";
import { normalizarSlug } from "@/domain/utils/normalizar-slug";
import { gerarSlugUnico } from "@/domain/utils/gerar-slug-unico";

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

  // Autoriza a action e fornece o ator/ip para o log de auditoria.
  const contexto = await exigirContextoAdmin();

  const sol = (await db.query.solicitacao.findFirst({
    where: (s, { eq }) => eq(s.id, solicitacaoId),
    with: {
      solicitante: true,
      categoriasSugeridas: true,
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

      // Gerar slug único
      const baseSlug = dados.nome
        ? normalizarSlug(dados.nome as string)
        : "sem-nome";
      const existentes = new Set(
        (await tx.select({ slug: negocio.slug }).from(negocio)).map(
          (n) => n.slug,
        ),
      );
      const slugUnico = gerarSlugUnico(baseSlug, existentes);

      const [novoNegocio] = await tx
        .insert(negocio)
        .values({
          slug: slugUnico,
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
        atorId: contexto.atorId,
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
        atorId: contexto.atorId,
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
        atorId: contexto.atorId,
        solicitacaoId,
        decisao: "solicitar_correcao",
        justificativa,
      });
    }

    // Índice consultável de auditoria (RF-062): uma linha por decisão.
    await appendLog(
      {
        ...contexto,
        acao: `decidir_solicitacao_${decisao}`,
        entidadeTipo: "solicitacao",
        entidadeId: solicitacaoId,
        detalhes: {
          decisao,
          justificativa: justificativa ?? null,
          situacaoResultante: resultado.situacao,
        },
        snapshotAntes: { situacao: sol.situacao },
        snapshotDepois: {
          situacao: resultado.situacao,
          negocioId: resultado.negocioId ?? null,
        },
      },
      tx,
    );
  });

  // Enviar e-mail transacional
  if (sol.solicitante) {
    const nomeNegocio = (sol.dadosNegocioProposto as Record<string, unknown>)
      .nome as string;
    // O log de comunicação registra o resultado REAL do envio: um e-mail que
    // falhou não pode aparecer como sucesso na auditoria.
    let envioOk = false;
    let erroEnvio: string | null = null;

    try {
      const envio = await enviarEmailAnaliseSolicitacao(
        sol.solicitante.email,
        sol.solicitante.nome,
        nomeNegocio,
        decisao,
        justificativa,
      );
      envioOk = envio.success;
      erroEnvio = envio.error ?? null;
    } catch (erro) {
      erroEnvio = erro instanceof Error ? erro.message : "erro desconhecido";
    }

    if (!envioOk) {
      console.error("[Análise] Falha ao enviar e-mail:", erroEnvio);
    }

    await db.insert(logComunicacao).values({
      atorTipo: "sistema",
      tipo: "analise_solicitacao",
      destinatario: sol.solicitante.email,
      sucesso: envioOk,
      erro: erroEnvio,
    });
  }

  revalidatePath("/admin/solicitacoes");

  return {
    success: true,
    situacao: resultado?.situacao,
    negocioId: resultado?.negocioId,
  };
}
