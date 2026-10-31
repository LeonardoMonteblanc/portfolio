// src/application/media/processar.service.ts
import { db } from "@/infrastructure/db/client";
import { imagem, anexo, solicitacao } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import {
  buscarProximoJob,
  concluirJob,
  falharJob,
  type JobPayload,
} from "@/infrastructure/queue/queue.service";

/**
 * F8-04 / F8-05 — worker da fila de mídia.
 *
 * Regras preservadas:
 * - Imagem enviada entra na fila como `pendente` e SÓ é publicada após a
 *   moderação do admin (RF-057). O worker nunca aprova sozinho.
 * - Promover anexo a imagem (RF-060) cria um novo registro `pendente` e
 *   PRESERVA o anexo original.
 */

async function processarJobImagem(
  jobId: string,
  payload: JobPayload,
): Promise<void> {
  if (payload.acao === "promover_anexo") {
    if (!payload.anexoId) throw new Error("payload.anexoId ausente");

    const anexoEncontrado = await db
      .select()
      .from(anexo)
      .where(eq(anexo.id, payload.anexoId))
      .limit(1);

    const origem = anexoEncontrado[0];
    if (!origem) throw new Error("Anexo não encontrado");

    const solicitacaoOrigem = await db
      .select({ negocioId: solicitacao.negocioId })
      .from(solicitacao)
      .where(eq(solicitacao.id, origem.solicitacaoId))
      .limit(1);

    const negocioId = solicitacaoOrigem[0]?.negocioId ?? null;
    if (!negocioId) {
      throw new Error(
        "Anexo não pode ser promovido: a solicitação não tem negócio vinculado",
      );
    }

    const novaImagem = await db
      .insert(imagem)
      .values({
        negocioId,
        solicitacaoId: origem.solicitacaoId,
        anexoOrigemId: origem.id,
        tipo: "foto",
        situacao: "pendente",
        url: origem.arquivoUrl,
      })
      .returning({ id: imagem.id });

    await concluirJob(jobId, {
      acao: "promover_anexo",
      imagemId: novaImagem[0]?.id,
      anexoId: origem.id,
    });
    return;
  }

  if (!payload.imagemId) {
    throw new Error("Payload inválido para processar_imagem");
  }

  const imagemEncontrada = await db
    .select({ id: imagem.id, situacao: imagem.situacao })
    .from(imagem)
    .where(eq(imagem.id, payload.imagemId))
    .limit(1);

  const alvo = imagemEncontrada[0];
  if (!alvo) throw new Error("Imagem não encontrada");

  // A imagem continua `pendente` até a moderação (RF-057).
  await concluirJob(jobId, {
    acao: "processar_imagem",
    imagemId: alvo.id,
    situacao: alvo.situacao,
  });
}

async function processarJobAnexo(
  jobId: string,
  payload: JobPayload,
): Promise<void> {
  if (!payload.anexoId) throw new Error("anexoId ausente");

  const anexoEncontrado = await db
    .select({ id: anexo.id })
    .from(anexo)
    .where(eq(anexo.id, payload.anexoId))
    .limit(1);

  if (!anexoEncontrado[0]) throw new Error("Anexo não encontrado");

  await db
    .update(anexo)
    .set({ situacao: "disponivel" })
    .where(eq(anexo.id, anexoEncontrado[0].id));

  await concluirJob(jobId, { anexoId: anexoEncontrado[0].id });
}

export interface ResultadoProcessamentoFila {
  processados: number;
  erros: number;
}

/** Worker principal: consome até 10 jobs por execução (preserva limite da função serverless). */
export async function processarFila(): Promise<ResultadoProcessamentoFila> {
  let processados = 0;
  let erros = 0;

  for (let i = 0; i < 10; i += 1) {
    const job = await buscarProximoJob();
    if (!job) break;

    try {
      switch (job.tipo) {
        case "processar_imagem":
        case "promover_anexo":
          await processarJobImagem(job.id, job.payload);
          break;
        case "processar_anexo":
          await processarJobAnexo(job.id, job.payload);
          break;
        default:
          throw new Error(`Tipo de job desconhecido: ${job.tipo}`);
      }
      processados += 1;
    } catch (erro) {
      erros += 1;
      await falharJob(
        job.id,
        erro instanceof Error ? erro.message : "Erro desconhecido",
        job.maxTentativas,
      );
    }
  }

  return { processados, erros };
}
