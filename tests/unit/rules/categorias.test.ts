// tests/unit/rules/categorias.test.ts
import { describe, it, expect } from "vitest";
import {
  validarCriacaoCategoria,
  validarDesativacaoCategoria,
  validarSugestaoCategoria,
  validarTriagemSugestao,
  validarMesclagemCategorias,
} from "@/domain/rules/categorias";

function isErro(result: { ok: boolean }): result is {
  ok: false;
  erros: Array<{ codigo: string; message?: string }>;
} {
  return result.ok === false;
}

function isSucesso(result: { ok: boolean }): result is { ok: true } {
  return result.ok === true;
}

describe("RN35–RN38 — Categorias", () => {
  describe("validarCriacaoCategoria (RN35)", () => {
    it("passa com adminId e nome", () => {
      const resultado = validarCriacaoCategoria({
        adminId: "admin-1",
        nome: "Padaria",
        descricao: "Comércios de pães e doces",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem adminId", () => {
      const resultado = validarCriacaoCategoria({
        adminId: "",
        nome: "Padaria",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "ADMIN_OBRIGATORIO"),
      ).toBe(true);
    });

    it("falha sem nome", () => {
      const resultado = validarCriacaoCategoria({
        adminId: "admin-1",
        nome: "",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CAMPO_OBRIGATORIO"),
      ).toBe(true);
    });
  });

  describe("validarDesativacaoCategoria (RN35)", () => {
    it("passa sem negócios associados", () => {
      const resultado = validarDesativacaoCategoria(0);
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha com negócios associados", () => {
      const resultado = validarDesativacaoCategoria(3);
      if (!isErro(resultado)) throw new Error("should fail");
      expect(resultado.erros.some((e) => e.codigo === "CATEGORIA_EM_USO")).toBe(
        true,
      );
      if (resultado.erros[0]?.message) {
        expect(resultado.erros[0].message).toContain("3 negócios");
      }
    });
  });

  describe("validarSugestaoCategoria (RN37, RN38)", () => {
    it("passa com texto e solicitação", () => {
      const resultado = validarSugestaoCategoria({
        textoSugerido: "Nova categoria",
        solicitacaoId: "sol-1",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem texto", () => {
      const resultado = validarSugestaoCategoria({
        textoSugerido: "",
        solicitacaoId: "sol-1",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CAMPO_OBRIGATORIO"),
      ).toBe(true);
    });

    it("falha sem solicitação", () => {
      const resultado = validarSugestaoCategoria({
        textoSugerido: "Nova categoria",
        solicitacaoId: "",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "SOLICITACAO_OBRIGATORIA"),
      ).toBe(true);
    });
  });

  describe("validarTriagemSugestao (RN38)", () => {
    it("passa aceitando sugestão", () => {
      const resultado = validarTriagemSugestao({
        acao: "aceitar",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("passa rejeitando com justificativa interna", () => {
      const resultado = validarTriagemSugestao({
        acao: "rejeitar",
        justificativaInterna: "Duplicada",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha rejeitando sem justificativa interna", () => {
      const resultado = validarTriagemSugestao({
        acao: "rejeitar",
        justificativaInterna: "",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "JUSTIFICATIVA_OBRIGATORIA"),
      ).toBe(true);
    });
  });

  describe("validarMesclagemCategorias (RN35)", () => {
    it("passa com categorias diferentes e negócios migrados", () => {
      const resultado = validarMesclagemCategorias({
        categoriaOrigemId: "cat-1",
        categoriaDestinoId: "cat-2",
        negociosMigrados: 5,
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha com categorias iguais", () => {
      const resultado = validarMesclagemCategorias({
        categoriaOrigemId: "cat-1",
        categoriaDestinoId: "cat-1",
        negociosMigrados: 5,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CATEGORIAS_IGUAIS"),
      ).toBe(true);
    });

    it("falha com negócios migrados negativo", () => {
      const resultado = validarMesclagemCategorias({
        categoriaOrigemId: "cat-1",
        categoriaDestinoId: "cat-2",
        negociosMigrados: -1,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(resultado.erros.some((e) => e.codigo === "VALOR_INVALIDO")).toBe(
        true,
      );
    });
  });
});
