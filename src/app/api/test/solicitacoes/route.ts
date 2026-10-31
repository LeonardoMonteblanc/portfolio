// src/app/api/test/solicitacoes/route.ts
import { NextResponse } from "next/server";
import { exigirAdmin, erroInterno } from "@/lib/api-guard";
import { listarSolicitacoesAction } from "@/application/solicitacoes/listar";

export async function GET() {
  const bloqueio = await exigirAdmin();
  if (bloqueio) return bloqueio;

  try {
    const formData = new FormData();
    formData.append("pagina", "1");
    formData.append("porPagina", "20");
    const result = await listarSolicitacoesAction(null, formData);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(erroInterno(error), { status: 500 });
  }
}
