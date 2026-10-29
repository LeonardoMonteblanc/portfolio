// src/app/api/test/solicitacoes/route.ts
import { listarSolicitacoesAction } from "@/application/solicitacoes/listar";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const formData = new FormData();
    formData.append("pagina", "1");
    formData.append("porPagina", "20");
    const result = await listarSolicitacoesAction(null, formData);
    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message, stack: e.stack },
      { status: 500 },
    );
  }
}
