// src/app/api/test/categorias/route.ts
import { listarCategoriasAction } from "@/application/categorias/listar";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await listarCategoriasAction({
      pagina: 1,
      porPagina: 20,
    });
    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message, stack: e.stack },
      { status: 500 },
    );
  }
}
