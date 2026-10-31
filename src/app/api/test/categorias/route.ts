// src/app/api/test/categorias/route.ts
import { NextResponse } from "next/server";
import { exigirAdmin, erroInterno } from "@/lib/api-guard";
import { listarCategoriasAction } from "@/application/categorias/listar";

export async function GET() {
  const bloqueio = await exigirAdmin();
  if (bloqueio) return bloqueio;

  try {
    const result = await listarCategoriasAction({
      pagina: 1,
      porPagina: 20,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(erroInterno(error), { status: 500 });
  }
}
