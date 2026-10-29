// src/application/solicitacoes/listar.ts
"use server";

import { db } from "@/infrastructure/db/client";
import { solicitacao, solicitante } from "@/infrastructure/db/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm";

const listarSolicitacoesSchema = {
  situacao: z
    .enum([
      "recebida",
      "em_fila_contestacao",
      "aprovada",
      "reprovada",
      "incompleta",
    ])
    .optional(),
  tipo: z.enum(["inclusao", "atualizacao"]).optional(),
  busca: z.string().optional(),
  pagina: z.coerce.number().min(1).default(1),
  porPagina: z.coerce.number().min(1).max(100).default(20),
} as const;

import { z } from "zod";

export async function listarSolicitacoesAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    situacao: formData.get("situacao") || undefined,
    tipo: formData.get("tipo") || undefined,
    busca: formData.get("busca") || undefined,
    pagina: formData.get("pagina") ? Number(formData.get("pagina")) : 1,
    porPagina: formData.get("porPagina")
      ? Number(formData.get("porPagina"))
      : 20,
  };

  const parseResult = z.object(listarSolicitacoesSchema).safeParse(rawData);
  if (!parseResult.success) {
    return {
      error: "Parâmetros inválidos",
      solicitacoes: [],
      total: 0,
      pagina: 1,
      porPagina: 20,
    };
  }

  const { situacao, tipo, busca, pagina, porPagina } = parseResult.data;

  const whereConditions = [];
  if (situacao) whereConditions.push(eq(solicitacao.situacao, situacao));
  if (tipo) whereConditions.push(eq(solicitacao.tipo, tipo));
  if (busca) {
    whereConditions.push(
      sql`${solicitacao.dadosNegocioProposto}->>'nome' ILIKE ${`%${busca}%`}`,
    );
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const whereSql = whereClause ? sql`WHERE ${whereClause}` : sql``;

  const [solicitacoesResult, totalResult] = await Promise.all([
    db
      .select({
        id: solicitacao.id,
        situacao: solicitacao.situacao,
        tipo: solicitacao.tipo,
        criadoEm: solicitacao.criadoEm,
        solicitanteId: solicitacao.solicitanteId,
        negocioId: solicitacao.negocioId,
        origemDecisao: solicitacao.origemDecisao,
        declaracaoVinculo: solicitacao.declaracaoVinculo,
      })
      .from(solicitacao)
      .where(whereClause)
      .orderBy(desc(solicitacao.criadoEm))
      .limit(20)
      .offset(0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(solicitacao)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count || 0);

  return {
    solicitacoes: solicitacoesResult as any[],
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  };
}

export async function buscarSolicitacaoPorIdAction(
  prevState: unknown,
  formData: FormData,
) {
  const id = formData.get("id") as string;

  if (!id) {
    return { error: "ID é obrigatório" };
  }

  const sol = await db.query.solicitacao.findFirst({
    where: (s, { eq }) => eq(s.id, id),
    with: {
      solicitante: true,
      categoriasSugeridas: true,
    },
  });

  if (!sol) {
    return { error: "Solicitação não encontrada" };
  }

  return { solicitacao: sol as any };
}
