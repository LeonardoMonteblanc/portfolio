// src/app/api/test/negocios/route.ts
import { NextResponse } from "next/server";
import { exigirAdmin, erroInterno } from "@/lib/api-guard";
import { listarNegociosAction } from "@/application/negocios/listar";

export async function GET() {
  const bloqueio = await exigirAdmin();
  if (bloqueio) return bloqueio;

  try {
    const result = await listarNegociosAction({
      pagina: 1,
      porPagina: 20,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(erroInterno(error), { status: 500 });
  }
}
