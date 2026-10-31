// src/app/api/manutencao/diaria/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { autorizadoPorCron } from "@/lib/cron-auth";
import { cronAnonimizacaoAutomatica } from "@/application/lgpd/anonymize.service";
import { atualizarViewAuditoria } from "@/application/auditoria/auditoria.service";
import { processarFila } from "@/application/media/processar.service";
import { limparJobsAntigos } from "@/infrastructure/queue/queue.service";
import { dispararAlerta } from "@/infrastructure/alertas/alerta.service";

/**
 * Manutenção diária (Vercel Cron → `0 3 * * *`).
 *
 * Reúne as rotinas que precisam rodar uma vez por dia, em vez de gastar um cron
 * por tarefa (o plano Hobby da Vercel limita a 2 execuções diárias):
 *   1. expurgo LGPD por retenção (RNF-018 / F9-08);
 *   2. atualização da view materializada de auditoria (RF-063 / F9-06);
 *   3. processamento da fila de mídia (F8-04);
 *   4. limpeza de jobs antigos (> 30 dias).
 *
 * Cada etapa roda isolada: uma falha não impede as demais e volta no relatório.
 */
export async function GET(request: NextRequest) {
  const porCron = autorizadoPorCron(request);

  if (!porCron) {
    const admin = await getAdmin();
    if (!admin?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const inicio = Date.now();
  const erros: Array<{ etapa: string; erro: string }> = [];
  const resultado: Record<string, unknown> = {};

  const executar = async (
    etapa: string,
    acao: () => Promise<unknown>,
  ): Promise<void> => {
    try {
      resultado[etapa] = await acao();
    } catch (erro) {
      const mensagem =
        erro instanceof Error ? erro.message : "erro desconhecido";
      erros.push({ etapa, erro: mensagem });
      console.error(`[Manutenção] Falha em ${etapa}:`, erro);
    }
  };

  await executar("expurgoLgpd", () => cronAnonimizacaoAutomatica());
  await executar("atualizarViewAuditoria", () => atualizarViewAuditoria());
  await executar("processarFilaMidia", () => processarFila());
  await executar("limparJobsAntigos", () => limparJobsAntigos());

  if (erros.length > 0) {
    // RNF-031: falha de rotina noturna precisa chegar em alguém, não só no log.
    await dispararAlerta({
      tipo: "manutencao_diaria_falhou",
      severidade: "aviso",
      mensagem: `${erros.length} etapa(s) da manutenção diária falharam.`,
      contexto: {
        erros: erros.map((erro) => `${erro.etapa}: ${erro.erro}`).join(" | "),
        origem: porCron ? "cron" : "admin",
      },
    });
  }

  return NextResponse.json(
    {
      success: erros.length === 0,
      origem: porCron ? "cron" : "admin",
      duracaoMs: Date.now() - inicio,
      etapas: resultado,
      erros,
    },
    { status: erros.length === 0 ? 200 : 207 },
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}
