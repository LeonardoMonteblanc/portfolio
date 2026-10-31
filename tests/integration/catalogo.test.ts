import { beforeEach, describe, expect, it } from "vitest";
import {
  buscarNegocios,
  listarBairrosComNegocios,
  listarCategoriasAtivas,
} from "@/application/catalogo";
import { criarCategoria, criarNegocio, limparBanco } from "./setup";

/**
 * RF-001 a RF-005 (F4-03..F4-07) — contrato da consulta do catálogo.
 * Cobre os defeitos corrigidos em 2026-10-31: busca textual com alias
 * inválido (42P01), insensibilidade a acento e total de paginação.
 */
describe("catálogo — busca e filtros", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  it("lista apenas negócios publicados", async () => {
    await criarNegocio({ slug: "padaria-do-ze", nome: "Padaria do Zé" });
    await criarNegocio({
      slug: "loja-oculta",
      nome: "Loja Oculta",
      situacao: "nao_publicado",
    });

    const { negocios, paginacao } = await buscarNegocios();

    expect(negocios.map((n) => n.slug)).toEqual(["padaria-do-ze"]);
    expect(paginacao.total).toBe(1);
  });

  it("encontra pelo nome ignorando acento e caixa", async () => {
    await criarNegocio({ slug: "padaria-do-ze", nome: "Padaria do Zé" });

    const semAcento = await buscarNegocios({ q: "ze" });
    const comAcento = await buscarNegocios({ q: "ZÉ" });
    const maiusculo = await buscarNegocios({ q: "PADARIA" });

    expect(semAcento.negocios).toHaveLength(1);
    expect(comAcento.negocios).toHaveLength(1);
    expect(maiusculo.negocios).toHaveLength(1);
  });

  it("encontra pela descrição e pelo nome da categoria", async () => {
    await criarNegocio({
      slug: "atelie",
      nome: "Ateliê",
      descricao: "Costura criativa e reparos de roupas",
      categorias: ["costura"],
    });
    await criarCategoria("costura", "Costura");

    const porDescricao = await buscarNegocios({ q: "reparos" });
    const porCategoria = await buscarNegocios({ q: "costura" });

    expect(porDescricao.negocios.map((n) => n.slug)).toEqual(["atelie"]);
    expect(porCategoria.negocios.map((n) => n.slug)).toEqual(["atelie"]);
  });

  it("filtra por categoria e por bairro, e combina os dois", async () => {
    await criarNegocio({
      slug: "padaria-centro",
      nome: "Padaria Centro",
      bairro: "Centro",
      categorias: ["padaria"],
    });
    await criarNegocio({
      slug: "padaria-bairro",
      nome: "Padaria Bairro",
      bairro: "São Roque",
      categorias: ["padaria"],
    });
    await criarNegocio({
      slug: "mercado-centro",
      nome: "Mercado Centro",
      bairro: "Centro",
      categorias: ["mercado"],
    });

    const categorias = await listarCategoriasAtivas();
    const idPadaria = categorias.find((c) => c.slug === "padaria")?.id;
    expect(idPadaria).toBeTruthy();

    const soPadaria = await buscarNegocios({
      categoriasIds: [idPadaria as string],
    });
    expect(soPadaria.negocios.map((n) => n.slug).sort()).toEqual([
      "padaria-bairro",
      "padaria-centro",
    ]);

    const soCentro = await buscarNegocios({ bairros: ["Centro"] });
    expect(soCentro.negocios.map((n) => n.slug).sort()).toEqual([
      "mercado-centro",
      "padaria-centro",
    ]);

    const combinado = await buscarNegocios({
      categoriasIds: [idPadaria as string],
      bairros: ["Centro"],
    });
    expect(combinado.negocios.map((n) => n.slug)).toEqual(["padaria-centro"]);
  });

  it("o total da paginação respeita os filtros (regressão)", async () => {
    await criarNegocio({
      slug: "a",
      nome: "A",
      bairro: "Centro",
      categorias: ["padaria"],
    });
    await criarNegocio({
      slug: "b",
      nome: "B",
      bairro: "Centro",
      categorias: ["padaria"],
    });
    await criarNegocio({
      slug: "c",
      nome: "C",
      bairro: "Outro",
      categorias: ["mercado"],
    });

    const semFiltro = await buscarNegocios({ porPagina: 1 });
    expect(semFiltro.paginacao.total).toBe(3);
    expect(semFiltro.paginacao.totalPaginas).toBe(3);
    expect(semFiltro.negocios).toHaveLength(1);

    const filtrado = await buscarNegocios({
      bairros: ["Centro"],
      porPagina: 20,
    });
    expect(filtrado.paginacao.total).toBe(2);
    expect(filtrado.paginacao.totalPaginas).toBe(1);
  });

  it("devolve lista vazia quando nada casa com a busca", async () => {
    await criarNegocio({ slug: "padaria", nome: "Padaria" });

    const resultado = await buscarNegocios({ q: "helicoptero" });

    expect(resultado.negocios).toHaveLength(0);
    expect(resultado.paginacao.total).toBe(0);
    expect(resultado.paginacao.totalPaginas).toBe(0);
  });

  it("agrega bairros com contagem e ignora negócios não publicados", async () => {
    await criarNegocio({ slug: "a", nome: "A", bairro: "Centro" });
    await criarNegocio({ slug: "b", nome: "B", bairro: "Centro" });
    await criarNegocio({
      slug: "c",
      nome: "C",
      bairro: "Centro",
      situacao: "nao_publicado",
    });

    const bairros = await listarBairrosComNegocios();

    expect(bairros).toEqual([{ bairro: "Centro", total: 2 }]);
  });

  it("lista apenas categorias ativas", async () => {
    await criarCategoria("ativa", "Ativa");
    const inativa = await criarCategoria("inativa", "Inativa");
    const { db } = await import("@/infrastructure/db/client");
    const { categoria } = await import("@/infrastructure/db/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(categoria)
      .set({ ativa: false })
      .where(eq(categoria.id, inativa.id));

    const ativas = await listarCategoriasAtivas();

    expect(ativas.map((c) => c.slug)).toEqual(["ativa"]);
  });
});
