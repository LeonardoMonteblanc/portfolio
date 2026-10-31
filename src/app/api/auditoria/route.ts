// src/app/api/auditoria/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { consultarAuditoria } from "@/application/auditoria/auditoria.service";

/**
 * RF-063 / F9-13 — leitura da auditoria consolidada para o painel.
 * Somente admin. Aceita filtros por query string; a paginação é obrigatória
 * (limite máximo 200) para não derrubar a função serverless com SELECT gigante.
 */
const filtroSchema = z.object({
  atorId: z.string().uuid().optional(),
  acao: z.string().max(80).optional(),
  entidadeTipo: z.string().max(50).optional(),
  entidadeId: z.string().uuid().optional(),
  origem: z.string().max(60).optional(),
  desde: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
  limite: z.coerce.number().int().min(1).max(200).optional(),
  deslocamento: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parametros = Object.fromEntries(request.nextUrl.searchParams.entries());
  const validacao = filtroSchema.safeParse(parametros);

  if (!validacao.success) {
    return NextResponse.json(
      {
        error: "Filtro inválido",
        detalhes: validacao.error.issues.map((issue) => ({
          campo: issue.path.join("."),
          mensagem: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const resultado = await consultarAuditoria(validacao.data);
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[Auditoria] Falha na consulta:", error);
    return NextResponse.json(
      { error: "Falha ao consultar a auditoria" },
      { status: 500 },
    );
  }
}
