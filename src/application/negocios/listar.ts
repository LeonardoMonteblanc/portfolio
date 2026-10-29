// src/application/negocios/listar.ts
"use server";

import { db } from "@/infrastructure/db/client";
import {
  negocio,
  categoria,
  contato,
  localizacao,
  horarioFuncionamento,
  negocioCategoria,
} from "@/infrastructure/db/schema";
import { eq, desc, asc, ilike, or, and, sql, count } from "drizzle-orm";

interface ListarNegociosParams {
  pagina?: number;
  porPagina?: number;
  situacao?: string;
  busca?: string;
  ordenacao?:
    "nome_asc" | "nome_desc" | "criado_asc" | "criado_desc" | "atualizado_desc";
}

export async function listarNegociosAction(params: ListarNegociosParams = {}) {
  const {
    pagina = 1,
    porPagina = 20,
    situacao,
    busca,
    ordenacao = "atualizado_desc",
  } = params;

  const offset = (pagina - 1) * porPagina;

  // Query base
  let query = db.query.negocio.findMany({
    limit: porPagina,
    offset,
    orderBy: (n, { asc, desc }) => {
      switch (ordenacao) {
        case "nome_asc":
          return asc(n.nome);
        case "nome_desc":
          return desc(n.nome);
        case "criado_asc":
          return asc(n.criadoEm);
        case "criado_desc":
          return desc(n.criadoEm);
        case "atualizado_desc":
          return desc(n.atualizadoEm);
        default:
          return desc(n.atualizadoEm);
      }
    },
  });

  // Para filtros complexos, usaríamos query builder dinâmico
  // Aqui simplificado - em produção usaríamos query builder dinâmico

  const [negocios, total] = await Promise.all([query, db.$count(negocio)]);

  return {
    negocios,
    paginacao: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.ceil(total / porPagina),
    },
  };
}

export async function buscarNegocioPorSlug(slug: string) {
  return db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.slug, slug),
    with: {
      contatos: true,
      localizacao: true,
      horarios: true,
      categorias: { with: { categoria: true } },
    },
  });
}

export async function detectarDuplicataNegocio(
  nome: string,
  contatos: string[],
) {
  const nomeNormalizado = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Buscar por nome similar
  const similares = await db.query.negocio.findMany({
    where: (n, { sql }) =>
      sql`lower(unaccent(${n.nome})) ILIKE ${"%" + nomeNormalizado + "%"}`,
    limit: 5,
  });

  // Verificar se algum contato coincide
  const contatosNormalizados = contatos.map((c) => c.replace(/\D/g, ""));
  for (const c of contatosNormalizados) {
    if (c.length >= 10) {
      const comContato = await db.query.contato.findFirst({
        where: (c, { like }) => like(c.valor, `%${c}%`),
        with: { negocio: true },
      });
      if (comContato && !similares.find((s) => s.id === comContato.negocioId)) {
        similares.push(comContato.negocio);
      }
    }
  }

  return similares;
}
