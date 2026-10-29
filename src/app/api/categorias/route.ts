// src/app/api/categorias/route.ts
import { db } from "@/infrastructure/db/client";
import { categoria } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categorias = await db.query.categoria.findMany({
      where: eq(categoria.ativa, true),
      columns: {
        id: true,
        nome: true,
        slug: true,
      },
      orderBy: (c, { asc }) => asc(c.nome),
    });

    return NextResponse.json({ categorias });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
