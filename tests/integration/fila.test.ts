import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { job } from "@/infrastructure/db/schema";
import {
  buscarProximoJob,
  concluirJob,
  enfileirarJob,
  estatisticasFila,
  falharJob,
  limparJobsAntigos,
} from "@/infrastructure/queue/queue.service";
import { limparBanco } from "./setup";

/**
 * F8-04 — fila de mídia com `FOR UPDATE SKIP LOCKED`.
 * Garante que duas execuções do worker não peguem o mesmo job e que o
 * backoff não estoure o limite de tentativas.
 */
describe("fila de mídia", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  it("enfileira e reivindica o job, marcando como processando", async () => {
    const id = await enfileirarJob({ tipo: "processar_anexo", anexoId: "abc" });

    const reivindicado = await buscarProximoJob();
    expect(reivindicado?.id).toBe(id);
    expect(reivindicado?.tentativas).toBe(1);

    const [linha] = await db.select().from(job).where(eq(job.id, id));
    expect(linha?.status).toBe("processando");
    expect(linha?.tentativas).toBe(1);
  });

  it("duas reivindicações concorrentes pegam jobs diferentes", async () => {
    const primeiro = await enfileirarJob({
      tipo: "processar_anexo",
      anexoId: "1",
    });
    const segundo = await enfileirarJob({
      tipo: "processar_anexo",
      anexoId: "2",
    });

    const [a, b] = await Promise.all([buscarProximoJob(), buscarProximoJob()]);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a?.id).not.toBe(b?.id);
    expect([a?.id, b?.id].sort()).toEqual([primeiro, segundo].sort());
  });

  it("não entrega job agendado para o futuro", async () => {
    const futuro = new Date(Date.now() + 60 * 60 * 1000);
    await enfileirarJob({ tipo: "processar_anexo", anexoId: "x" }, futuro);

    expect(await buscarProximoJob()).toBeNull();
  });

  it("conclui o job e limpa o erro anterior", async () => {
    const id = await enfileirarJob({ tipo: "processar_anexo", anexoId: "abc" });
    await buscarProximoJob();
    await falharJob(id, "falha temporária", 3);
    await concluirJob(id, { ok: true });

    const [linha] = await db.select().from(job).where(eq(job.id, id));
    expect(linha?.status).toBe("concluido");
    expect(linha?.erro).toBeNull();
    expect(linha?.resultado).toEqual({ ok: true });
    expect(linha?.concluidoEm).toBeInstanceOf(Date);
  });

  it("reagenda com backoff e só desiste ao atingir o limite", async () => {
    const id = await enfileirarJob(
      { tipo: "processar_anexo", anexoId: "abc" },
      new Date(),
      2,
    );

    await buscarProximoJob(); // tentativa 1
    await falharJob(id, "erro 1", 2);

    const [depoisDoPrimeiroErro] = await db
      .select()
      .from(job)
      .where(eq(job.id, id));
    expect(depoisDoPrimeiroErro?.status).toBe("pendente");
    expect(depoisDoPrimeiroErro?.agendadoPara.getTime()).toBeGreaterThan(
      Date.now(),
    );

    // Força o job a ficar elegível novamente e consome a tentativa 2.
    await db
      .update(job)
      .set({ agendadoPara: new Date(Date.now() - 1000) })
      .where(eq(job.id, id));
    await buscarProximoJob();
    await falharJob(id, "erro 2", 2);

    const [final] = await db.select().from(job).where(eq(job.id, id));
    expect(final?.status).toBe("falhou");
    expect(final?.concluidoEm).toBeInstanceOf(Date);
  });

  it("resume as estatísticas por status", async () => {
    const pendente = await enfileirarJob({
      tipo: "processar_anexo",
      anexoId: "1",
    });
    const concluido = await enfileirarJob({
      tipo: "processar_anexo",
      anexoId: "2",
    });
    await enfileirarJob({ tipo: "processar_anexo", anexoId: "3" });

    await buscarProximoJob();
    await concluirJob(concluido, {});

    const stats = await estatisticasFila();
    expect(stats.pendentes).toBe(1);
    expect(stats.concluidos).toBe(1);
    expect(stats.processando).toBe(1);
    expect(pendente).toBeTruthy();
  });

  it("remove apenas jobs concluídos com mais de 30 dias", async () => {
    const antigo = await enfileirarJob({
      tipo: "processar_anexo",
      anexoId: "velho",
    });
    const novo = await enfileirarJob({
      tipo: "processar_anexo",
      anexoId: "novo",
    });

    const dataAntiga = new Date();
    dataAntiga.setDate(dataAntiga.getDate() - 40);

    await db
      .update(job)
      .set({ status: "concluido", concluidoEm: dataAntiga })
      .where(eq(job.id, antigo));
    await db
      .update(job)
      .set({ status: "concluido", concluidoEm: new Date() })
      .where(eq(job.id, novo));

    const removidos = await limparJobsAntigos();

    expect(removidos).toBe(1);
    const restantes = await db.select().from(job);
    expect(restantes.map((linha) => linha.id)).toEqual([novo]);
  });
});
