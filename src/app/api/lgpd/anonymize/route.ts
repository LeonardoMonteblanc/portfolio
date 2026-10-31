// src/app/api/lgpd/anonymize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import {
  anonimizarSolicitante,
  cronAnonimizacaoAutomatica,
} from "@/application/lgpd/anonymize.service";

/**
 * Autorização de cron (Vercel Cron): Authorization: Bearer <CRON_SECRET>.
 * Sem esse segredo configurado a rota nunca aceita chamadas automáticas.
 */
function autorizadoPorCron(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

function ipDaRequisicao(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "desconhecido"
  );
}

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron dispara GET — é este o caminho do expurgo automático (F9-08).
    if (autorizadoPorCron(request)) {
      const resultado = await cronAnonimizacaoAutomatica();
      return NextResponse.json(resultado);
    }

    const admin = await getAdmin();
    if (!admin?.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
    }

    return NextResponse.json({
      mensagem:
        "Use POST com { solicitanteId } para anonimizar um titular, ou configure CRON_SECRET para o expurgo automático.",
    });
  } catch (error) {
    console.error("[LGPD] Falha ao executar expurgo:", error);
    return NextResponse.json(
      { error: "Erro ao executar o expurgo" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let corpo: unknown = null;
    try {
      corpo = await request.json();
    } catch {
      corpo = null;
    }

    const dados =
      corpo && typeof corpo === "object"
        ? (corpo as Record<string, unknown>)
        : {};

    // Expurgo automático — autorizado apenas pelo segredo do cron.
    if (dados.cron === true) {
      if (!autorizadoPorCron(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const resultado = await cronAnonimizacaoAutomatica();
      return NextResponse.json(resultado);
    }

    const admin = await getAdmin();
    if (!admin?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const solicitanteId = dados.solicitanteId;
    if (typeof solicitanteId !== "string" || solicitanteId.length === 0) {
      return NextResponse.json(
        { error: "solicitanteId é obrigatório" },
        { status: 400 },
      );
    }

    const resultado = await anonimizarSolicitante(
      solicitanteId,
      admin.id,
      ipDaRequisicao(request),
      request.headers.get("user-agent") ?? undefined,
      "admin",
    );

    return NextResponse.json(resultado);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro interno";
    const status = mensagem === "Solicitante não encontrado" ? 404 : 500;
    console.error("[LGPD] Falha na anonimização:", error);
    return NextResponse.json({ error: mensagem }, { status });
  }
}
