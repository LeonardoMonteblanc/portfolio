// src/app/api/termos/route.ts
import { db } from "@/infrastructure/db/client";
import { documentoTermo } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const termos = await db.query.documentoTermo.findMany({
      where: eq(documentoTermo.vigente, true),
      columns: {
        tipo: true,
        versao: true,
        conteudo: true,
      },
    });

    return NextResponse.json({ termos });
  } catch (error) {
    console.error("Erro ao buscar termos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
