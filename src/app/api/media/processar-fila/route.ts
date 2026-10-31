// src/app/api/media/processar-fila/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { autorizadoPorCron } from "@/lib/cron-auth";
import { processarFila } from "@/application/media/processar.service";
import { estatisticasFila } from "@/infrastructure/queue/queue.service";

async function processar(request: NextRequest) {
  if (!autorizadoPorCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resultado = await processarFila();
    return NextResponse.json({ success: true, ...resultado });
  } catch (error) {
    console.error("[Fila de mídia] Erro ao processar:", error);
    return NextResponse.json(
      { error: "Erro ao processar a fila" },
      { status: 500 },
    );
  }
}

/**
 * Vercel Cron dispara GET (1x/min) com Authorization: Bearer $CRON_SECRET.
 * Admin autenticado no painel recebe as estatísticas da fila.
 */
export async function GET(request: NextRequest) {
  if (autorizadoPorCron(request)) {
    return processar(request);
  }

  const admin = await getAdmin();
  if (!admin?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await estatisticasFila();
  return NextResponse.json({ success: true, ...stats });
}

/** Chamada manual/administrativa da fila. */
export async function POST(request: NextRequest) {
  return processar(request);
}
