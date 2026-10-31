// src/infrastructure/queue/queue.service.ts
import { db } from "@/infrastructure/db/client";
import { job } from "@/infrastructure/db/schema";
import { and, asc, eq, lt, lte, sql } from "drizzle-orm";

export type TipoJob = "processar_imagem" | "processar_anexo" | "promover_anexo";

export interface JobPayload {
  tipo: TipoJob;
  anexoId?: string;
  imagemId?: string;
  acao?: string;
}

export interface JobReivindicado {
  id: string;
  tipo: string;
  payload: JobPayload;
  tentativas: number;
  maxTentativas: number;
}

/**
 * Enfileira um job de mídia. `agendadoPara` permite backoff (retry).
 */
export async function enfileirarJob(
  payload: JobPayload,
  agendadoPara: Date = new Date(),
  maxTentativas = 3,
): Promise<string> {
  const criado = await db
    .insert(job)
    .values({
      tipo: payload.tipo,
      payload,
      agendadoPara,
      maxTentativas,
    })
    .returning({ id: job.id });

  const id = criado[0]?.id;
  if (!id) throw new Error("Falha ao enfileirar job");
  return id;
}

/**
 * Reivindica o próximo job pendente com `FOR UPDATE SKIP LOCKED`, garantindo
 * que duas execuções concorrentes do worker não peguem o mesmo job.
 */
export async function buscarProximoJob(): Promise<JobReivindicado | null> {
  return db.transaction(async (tx) => {
    const proximo = await tx
      .select({
        id: job.id,
        tipo: job.tipo,
        payload: job.payload,
        tentativas: job.tentativas,
        maxTentativas: job.maxTentativas,
      })
      .from(job)
      .where(
        and(
          eq(job.status, "pendente"),
          lte(job.agendadoPara, new Date()),
          sql`${job.tentativas} < ${job.maxTentativas}`,
        ),
      )
      .orderBy(asc(job.agendadoPara))
      .limit(1)
      .for("update", { skipLocked: true });

    const alvo = proximo[0];
    if (!alvo) return null;

    await tx
      .update(job)
      .set({
        status: "processando",
        iniciadoEm: new Date(),
        tentativas: alvo.tentativas + 1,
      })
      .where(eq(job.id, alvo.id));

    return {
      id: alvo.id,
      tipo: alvo.tipo,
      payload: alvo.payload as JobPayload,
      tentativas: alvo.tentativas + 1,
      maxTentativas: alvo.maxTentativas,
    };
  });
}

export async function concluirJob(
  jobId: string,
  resultado: Record<string, unknown>,
): Promise<void> {
  await db
    .update(job)
    .set({
      status: "concluido",
      resultado,
      erro: null,
      concluidoEm: new Date(),
    })
    .where(eq(job.id, jobId));
}

/**
 * Registra falha e decide entre reagendar (backoff exponencial) ou encerrar.
 * A tentativa atual já foi contabilizada em `buscarProximoJob`.
 */
export async function falharJob(
  jobId: string,
  erro: string,
  maxTentativas: number,
): Promise<void> {
  const atual = await db
    .select({ tentativas: job.tentativas, maxTentativas: job.maxTentativas })
    .from(job)
    .where(eq(job.id, jobId))
    .limit(1);

  const linha = atual[0];
  if (!linha) return;

  const limite = maxTentativas || linha.maxTentativas;

  if (linha.tentativas >= limite) {
    await db
      .update(job)
      .set({ status: "falhou", erro, concluidoEm: new Date() })
      .where(eq(job.id, jobId));
    return;
  }

  const delayMinutos = Math.pow(2, linha.tentativas) * 5;
  const proximaTentativa = new Date(Date.now() + delayMinutos * 60 * 1000);

  await db
    .update(job)
    .set({ status: "pendente", erro, agendadoPara: proximaTentativa })
    .where(eq(job.id, jobId));
}

/** Remove jobs concluídos/falhos com mais de 30 dias. Retorna quantos saíram. */
export async function limparJobsAntigos(): Promise<number> {
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);

  const removidos = await db
    .delete(job)
    .where(
      and(
        sql`${job.status} IN ('concluido', 'falhou')`,
        lt(job.concluidoEm, limite),
      ),
    )
    .returning({ id: job.id });

  return removidos.length;
}

export interface EstatisticasFila {
  pendentes: number;
  processando: number;
  concluidos: number;
  falharam: number;
}

export async function estatisticasFila(): Promise<EstatisticasFila> {
  const linhas = await db
    .select({ status: job.status, total: sql<number>`count(*)::int` })
    .from(job)
    .groupBy(job.status);

  const resultado: EstatisticasFila = {
    pendentes: 0,
    processando: 0,
    concluidos: 0,
    falharam: 0,
  };

  for (const linha of linhas) {
    const total = Number(linha.total);
    if (linha.status === "pendente") resultado.pendentes = total;
    else if (linha.status === "processando") resultado.processando = total;
    else if (linha.status === "concluido") resultado.concluidos = total;
    else if (linha.status === "falhou") resultado.falharam = total;
  }

  return resultado;
}
