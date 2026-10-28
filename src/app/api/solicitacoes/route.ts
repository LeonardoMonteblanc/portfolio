// src/app/api/solicitacoes/route.ts
import { criarSolicitacaoAction } from "@/application/solicitacoes/criar";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await criarSolicitacaoAction(null, formData);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      solicitacao: result.solicitacao,
      duplicataDetectada: result.duplicataDetectada,
    });
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
