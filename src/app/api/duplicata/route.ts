// src/app/api/duplicata/route.ts
import { db } from "@/infrastructure/db/client";
import { negocio, contato } from "@/infrastructure/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type { Negocio } from "@/infrastructure/db/schema/negocio";
import type { Contato } from "@/infrastructure/db/schema/contato";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, contatos } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ duplicatas: [] });
    }

    const nomeNormalizado = nome
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const [duplicataNome, duplicataContato] = await Promise.all([
      db.query.negocio.findFirst({
        where: (n, { sql }) => sql`lower(${negocio.nome}) = ${nomeNormalizado}`,
      }),
      db.query.contato.findFirst({
        where: (c, { sql }) =>
          sql`${contato.valor} ILIKE ${`%${contatos[0]?.replace(/\D/g, "")}%`}`,
        with: { negocio: true },
      }),
    ]);

    const duplicatas: Array<{ id: string; nome: string; tipo: string }> = [];
    if (duplicataNome) {
      const negocio = duplicataNome as Negocio;
      duplicatas.push({
        id: negocio.id,
        nome: negocio.nome,
        tipo: "nome",
      });
    }
    if (duplicataContato && duplicataContato.negocio) {
      const negocio = duplicataContato.negocio as Negocio;
      duplicatas.push({
        id: negocio.id,
        nome: negocio.nome,
        tipo: "contato",
      });
    }

    return NextResponse.json({ duplicatas });
  } catch (error) {
    console.error("Erro ao verificar duplicata:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
