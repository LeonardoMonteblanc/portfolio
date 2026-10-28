// src/application/categorias/listar.ts
"use server";

import { db } from "@/infrastructure/db/client";
import { categoria } from "@/infrastructure/db/schema/categoria";
import { desc, asc, ilike, or } from "drizzle-orm";

interface ListarCategoriasParams {
  pagina?: number;
  porPagina?: number;
  busca?: string;
  ativa?: boolean;
  ordenacao?: "nome_asc" | "nome_desc" | "criado_asc" | "criado_desc";
}

export async function listarCategoriasAction(
  params: ListarCategoriasParams = {},
) {
  const {
    pagina = 1,
    porPagina = 20,
    busca,
    ativa,
    ordenacao = "nome_asc",
  } = params;

  const offset = (pagina - 1) * porPagina;

  let query = db.query.categoria.findMany({
    limit: porPagina,
    offset,
    orderBy: (c, { asc, desc }) => {
      switch (ordenacao) {
        case "nome_asc":
          return asc(c.nome);
        case "nome_desc":
          return desc(c.nome);
        case "criado_asc":
          return asc(c.criadoEm);
        case "criado_desc":
          return desc(c.criadoEm);
        default:
          return asc(c.nome);
      }
    },
  });

  // Aplicar filtros se necessário
  // Nota: Para filtros complexos, usaríamos query builder dinâmico
  // Aqui simplificado para demonstração

  const categorias = await query;
  const total = await db.$count(categoria);

  return {
    categorias,
    paginacao: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.ceil(total / porPagina),
    },
  };
}

export async function listarTodasCategoriasAtivas() {
  return db.query.categoria.findMany({
    where: (c, { eq }) => eq(c.ativa, true),
    orderBy: (c, { asc }) => asc(c.nome),
  });
}
