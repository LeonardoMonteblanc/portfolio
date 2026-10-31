// src/app/api/auditoria/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { autorizadoPorCron } from "@/lib/cron-auth";
import { atualizarViewAuditoria } from "@/application/auditoria/auditoria.service";

/**
 * RF-063 / F9-06 — atualização da view materializada de auditoria.
 * Aceita cron (CRON_SECRET) ou admin autenticado (botão no painel).
 */
export async function GET(request: NextRequest) {
  const porCron = autorizadoPorCron(request);

  if (!porCron) {
    const admin = await getAdmin();
    if (!admin?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const resultado = await atualizarViewAuditoria();
    return NextResponse.json({
      success: true,
      atualizadaEm: resultado.atualizadaEm.toISOString(),
      origem: porCron ? "cron" : "admin",
    });
  } catch (error) {
    console.error("[Auditoria] Falha ao atualizar a view:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar a view de auditoria" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
