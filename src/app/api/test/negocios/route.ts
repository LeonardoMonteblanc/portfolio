// src/app/api/test/negocios/route.ts
import { listarNegociosAction } from "@/application/negocios/listar";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await listarNegociosAction({
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
