// src/application/catalogo/buscar.ts
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
import { eq, and, or, desc, asc, sql, inArray, exists } from "drizzle-orm";
import { normalizarTexto } from "@/domain/utils/normalizar-texto";
import { calcularAbertoAgora } from "@/domain/utils/calcular-aberto-agora";

interface BuscarParams {
  q?: string;
  categoriasIds?: string[];
  bairros?: string[];
  pagina?: number;
  porPagina?: number;
  ordenacao?: "relevancia" | "nome_asc" | "nome_desc" | "atualizado_desc";
}

interface NegocioCompleto {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  situacaoPublicacao: string;
  categorias: Array<{ id: string; nome: string; slug: string }>;
  contatos: Array<{ tipo: string; valor: string; ordem: number }>;
  localizacao: { bairro: string | null; areaAtendimento: string | null } | null;
  horarios: Array<{
    diaSemana: number;
    horaAbertura: string;
    horaFechamento: string;
  }>;
  abertoAgora: "aberto" | "fechado" | "sem_horario";
}

export async function buscarNegocios(
  params: {
    q?: string;
    categoriasIds?: string[];
    bairros?: string[];
    pagina?: number;
    porPagina?: number;
    ordenacao?: "relevancia" | "nome_asc" | "nome_desc" | "atualizado_desc";
  } = {},
): Promise<{
  negocios: NegocioCompleto[];
  paginacao: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
  };
}> {
  const {
    q,
    categoriasIds,
    bairros,
    pagina = 1,
    porPagina = 20,
    ordenacao = "relevancia",
  } = params;

  const termoNormalizado = params.q
    ? params.q
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";

  // Build all conditions
  const conditions: any[] = [eq(negocio.situacaoPublicacao, "publicado")];

  if (termoNormalizado) {
    // Busca sem sensibilidade a acento/caixa: "pao" encontra "Pão", "ze" encontra "Zé".
    // O LIKE é aplicado sobre a coluna normalizada, então os acentos do termo
    // (já removidos acima) casam com os acentos removidos da coluna.
    const termoLike = `%${termoNormalizado}%`;
    const ACENTOS = "áàâãäéèêëíìîïóòôõöúùûüçñ";
    const SEM_ACENTO = "aaaaaeeeeiiiiooooouuuucn";
    const colunaNormalizada = (coluna: unknown) =>
      sql`translate(lower(${coluna}), ${ACENTOS}, ${SEM_ACENTO})`;

    conditions.push(
      or(
        sql`${colunaNormalizada(negocio.nome)} LIKE ${termoLike}`,
        sql`${colunaNormalizada(negocio.descricao)} LIKE ${termoLike}`,
        sql`EXISTS (
          SELECT 1
          FROM ${negocioCategoria} nc
          JOIN ${categoria} c ON c.id = nc.categoria_id
          WHERE nc.negocio_id = ${negocio.id}
            AND translate(lower(c.nome), ${ACENTOS}, ${SEM_ACENTO}) LIKE ${termoLike}
        )`,
      ),
    );
  }

  if (params.categoriasIds && params.categoriasIds.length > 0) {
    conditions.push(
      exists(
        db
          .select({ negocioId: negocioCategoria.negocioId })
          .from(negocioCategoria)
          .where(
            and(
              eq(negocioCategoria.negocioId, negocio.id),
              inArray(negocioCategoria.categoriaId, params.categoriasIds),
            ),
          ),
      ),
    );
  }

  if (params.bairros && params.bairros.length > 0) {
    conditions.push(
      exists(
        db
          .select({ negocioId: localizacao.negocioId })
          .from(localizacao)
          .where(
            and(
              eq(localizacao.negocioId, negocio.id),
              inArray(localizacao.bairro, params.bairros),
            ),
          ),
      ),
    );
  }

  // Build orderBy
  const orderByMap = {
    relevancia: desc(negocio.atualizadoEm),
    nome_asc: asc(negocio.nome),
    nome_desc: desc(negocio.nome),
    atualizado_desc: desc(negocio.atualizadoEm),
  };
  const orderBy = orderByMap[params.ordenacao || "relevancia"];

  // Execute query with all conditions at once
  const query = db
    .select({
      id: negocio.id,
      slug: negocio.slug,
      nome: negocio.nome,
      descricao: negocio.descricao,
      situacaoPublicacao: negocio.situacaoPublicacao,
      atualizadoEm: negocio.atualizadoEm,
    })
    .from(negocio)
    .where(and(...conditions))
    .orderBy(orderByMap[params.ordenacao || "relevancia"]);

  // O total precisa respeitar os mesmos filtros da listagem (RF-005 / F4-07):
  // antes contava todos os publicados e a paginação ficava incorreta ao filtrar.
  const totalResult = await db.$count(negocio, and(...conditions));
  const negociosBase = await query
    .limit(params.porPagina || 20)
    .offset(((params.pagina || 1) - 1) * (params.porPagina || 20));

  if (negociosBase.length === 0) {
    return {
      negocios: [],
      paginacao: {
        pagina: params.pagina || 1,
        porPagina: params.porPagina || 20,
        total: 0,
        totalPaginas: 0,
      },
    };
  }

  const negociosIds = negociosBase.map((n) => n.id);

  const [contatosArr, localizacoesArr, horariosArr, categoriasRel] =
    await Promise.all([
      db
        .select()
        .from(contato)
        .where(
          and(
            eq(contato.valido, true),
            inArray(contato.negocioId, negociosIds),
          ),
        ),
      db
        .select()
        .from(localizacao)
        .where(inArray(localizacao.negocioId, negociosIds)),
      db
        .select()
        .from(horarioFuncionamento)
        .where(inArray(horarioFuncionamento.negocioId, negociosIds)),
      db
        .select({
          negocioId: negocioCategoria.negocioId,
          categoria: {
            id: categoria.id,
            nome: categoria.nome,
            slug: categoria.slug,
          },
        })
        .from(negocioCategoria)
        .innerJoin(categoria, eq(negocioCategoria.categoriaId, categoria.id))
        .where(
          and(
            eq(categoria.ativa, true),
            inArray(negocioCategoria.negocioId, negociosIds),
          ),
        ),
    ]);

  // Group related data by negocioId
  const contatosByNegocio = new Map<
    string,
    Array<{ tipo: string; valor: string; ordem: number }>
  >();
  for (const c of contatosArr) {
    if (!contatosByNegocio.has(c.negocioId))
      contatosByNegocio.set(c.negocioId, []);
    contatosByNegocio
      .get(c.negocioId)!
      .push({ tipo: c.tipo, valor: c.valor, ordem: c.ordem });
  }

  const localizacoesByNegocio = new Map<
    string,
    { bairro: string | null; areaAtendimento: string | null }
  >();
  for (const l of localizacoesArr) {
    localizacoesByNegocio.set(l.negocioId, {
      bairro: l.bairro,
      areaAtendimento: l.areaAtendimento,
    });
  }

  const horariosByNegocio = new Map<
    string,
    Array<{ diaSemana: number; horaAbertura: string; horaFechamento: string }>
  >();
  for (const h of horariosArr) {
    if (!horariosByNegocio.has(h.negocioId))
      horariosByNegocio.set(h.negocioId, []);
    horariosByNegocio.get(h.negocioId)!.push({
      diaSemana: h.diaSemana,
      horaAbertura: h.horaAbertura,
      horaFechamento: h.horaFechamento,
    });
  }

  const categoriasByNegocio = new Map<
    string,
    Array<{ id: string; nome: string; slug: string }>
  >();
  for (const c of categoriasRel) {
    if (!categoriasByNegocio.has(c.negocioId))
      categoriasByNegocio.set(c.negocioId, []);
    categoriasByNegocio.get(c.negocioId)!.push({
      id: c.categoria.id,
      nome: c.categoria.nome,
      slug: c.categoria.slug,
    });
  }

  const agora = new Date();
  const negocios: NegocioCompleto[] = negociosBase.map((n) => {
    const horariosN = horariosArr
      .filter((h) => h.negocioId === n.id)
      .map((h) => ({
        diaSemana: h.diaSemana,
        horaAbertura: h.horaAbertura,
        horaFechamento: h.horaFechamento,
      }));
    const abertoAgora: "aberto" | "fechado" | "sem_horario" =
      horariosN.length > 0
        ? calcularAbertoAgora(horariosN, new Date())
        : "sem_horario";

    return {
      id: n.id,
      slug: n.slug,
      nome: n.nome,
      descricao: n.descricao,
      situacaoPublicacao: n.situacaoPublicacao,
      categorias: categoriasByNegocio.get(n.id) || [],
      contatos: (contatosByNegocio.get(n.id) || []).sort(
        (a, b) => a.ordem - b.ordem,
      ),
      localizacao: localizacoesByNegocio.get(n.id) || null,
      horarios: horariosN,
      abertoAgora,
    };
  });

  return {
    negocios,
    paginacao: {
      pagina: params.pagina || 1,
      porPagina: params.porPagina || 20,
      total: totalResult,
      totalPaginas: Math.ceil(totalResult / (params.porPagina || 20)),
    },
  };
}

export async function buscarNegocioPorSlug(slug: string) {
  const n = await db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.slug, slug),
    with: {
      contatos: true,
      localizacao: true,
      horarios: true,
      categorias: {
        with: {
          categoria: true,
        },
      },
    },
  });

  if (!n || n.situacaoPublicacao !== "publicado") return null;

  const nTyped = n as {
    id: string;
    slug: string;
    nome: string;
    descricao: string;
    situacaoPublicacao: string;
    contatos: Array<{
      tipo: string;
      valor: string;
      ordem: number;
      valido: boolean;
    }>;
    localizacao: {
      bairro: string | null;
      areaAtendimento: string | null;
    } | null;
    horarios: Array<{
      diaSemana: number;
      horaAbertura: string;
      horaFechamento: string;
    }>;
    categorias: Array<{
      categoria: { id: string; nome: string; slug: string; ativa: boolean };
    }>;
  };

  if (!n || n.situacaoPublicacao !== "publicado") return null;

  const horariosN = (n.horarios ?? []) as Array<{
    diaSemana: number;
    horaAbertura: string;
    horaFechamento: string;
  }>;
  const categoriasN = (n.categorias ?? []) as Array<{
    categoria: { id: string; nome: string; slug: string; ativa: boolean };
  }>;
  const contatosN = (n.contatos ?? []) as Array<{
    valido: boolean;
    ordem: number;
  }>;
  const abertoAgora =
    horariosN.length > 0
      ? calcularAbertoAgora(
          horariosN.map((h) => ({
            diaSemana: h.diaSemana,
            horaAbertura: h.horaAbertura,
            horaFechamento: h.horaFechamento,
          })),
          new Date(),
        )
      : "sem_horario";

  return {
    id: n.id,
    slug: n.slug,
    nome: n.nome,
    descricao: n.descricao,
    situacaoPublicacao: n.situacaoPublicacao,
    categorias: categoriasN
      .filter((c) => c.categoria.ativa)
      .map((c) => ({
        id: c.categoria.id,
        nome: c.categoria.nome,
        slug: c.categoria.slug,
      })),
    contatos: contatosN
      .filter((c) => c.valido)
      .sort((a, b) => a.ordem - b.ordem),
    localizacao: n.localizacao
      ? {
          bairro: (n.localizacao as any).bairro,
          areaAtendimento: (n.localizacao as any).areaAtendimento,
        }
      : null,
    horarios: horariosN,
    abertoAgora,
  };
}

export async function listarCategoriasAtivas() {
  return db.query.categoria.findMany({
    where: (c, { eq }) => eq(c.ativa, true),
    orderBy: (c, { asc }) => asc(c.nome),
  });
}

export interface BairroComTotal {
  bairro: string;
  total: number;
}

/**
 * Bairros com ao menos um negócio publicado, com contagem por bairro.
 * Alimenta o filtro de bairro do catálogo (RF-004 / F4-06).
 */
export async function listarBairrosComNegocios(): Promise<BairroComTotal[]> {
  const result = await db
    .select({
      bairro: localizacao.bairro,
      total: sql<number>`count(*)::int`,
    })
    .from(localizacao)
    .innerJoin(negocio, eq(negocio.id, localizacao.negocioId))
    .where(
      and(
        eq(negocio.situacaoPublicacao, "publicado"),
        sql`${localizacao.bairro} IS NOT NULL`,
      ),
    )
    .groupBy(localizacao.bairro)
    .orderBy(asc(localizacao.bairro));

  return result
    .filter((r): r is { bairro: string; total: number } => r.bairro !== null)
    .map((r) => ({ bairro: r.bairro, total: Number(r.total) }));
}

export interface NegocioSitemap {
  slug: string;
  atualizadoEm: Date;
}

/**
 * Negócios publicados, no formato mínimo para o sitemap (RF-066 / F4-12).
 */
export async function listarNegociosPublicadosParaSitemap(): Promise<
  NegocioSitemap[]
> {
  return db
    .select({ slug: negocio.slug, atualizadoEm: negocio.atualizadoEm })
    .from(negocio)
    .where(eq(negocio.situacaoPublicacao, "publicado"))
    .orderBy(desc(negocio.atualizadoEm));
}
