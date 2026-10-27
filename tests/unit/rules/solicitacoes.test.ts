// tests/unit/rules/solicitacoes.test.ts
import { describe, it, expect } from "vitest";
import {
  validarEnvioSolicitacao,
  validarAtualizacaoNaoCriaDuplicata,
  validarVinculacaoSolicitacao,
} from "@/domain/rules/solicitacoes";

describe("RN01–RN11 — Solicitações e cadastro", () => {
  describe("validarEnvioSolicitacao", () => {
    it("passa com todos os campos obrigatórios", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (!resultado.ok) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem nome do solicitante", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("falha sem e-mail", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("falha sem telefone", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("falha sem nome do negócio", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("falha sem descrição", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("falha sem contatos", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("falha sem categorias nem sugestão", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: [], sugestao: "" },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("passa com sugestão em vez de categorias", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: [], sugestao: "Nova categoria" },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: true,
      });
      if (!resultado.ok) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem declaração de vínculo", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "",
        aceiteTermos: true,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it("falha sem aceite de termos", () => {
      const resultado = validarEnvioSolicitacao({
        nomeSolicitante: "João",
        email: "joao@email.com",
        telefone: "54999999999",
        nomeNegocio: "Padaria do João",
        descricao: "Melhor pão da cidade",
        contatos: [{ tipo: "whatsapp", valor: "54999999999" }],
        categoriasOuSugestao: { categorias: ["padaria"] },
        declaracaoVinculo: "Sou o proprietário",
        aceiteTermos: false,
      });
      if (resultado.ok) throw new Error("should fail");
      expect(resultado.erros.length).toBeGreaterThan(0);
      expect(
        resultado.erros.some((e) => e.codigo === "ACEITE_OBRIGATORIO"),
      ).toBe(true);
    });
  });

  describe("validarAtualizacaoNaoCriaDuplicata (RN11)", () => {
    it("passa quando negócio existe e solicitação vinculada", () => {
      const resultado = validarAtualizacaoNaoCriaDuplicata(true, true);
      if (!resultado.ok) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("passa quando não há negócio existente", () => {
      const resultado = validarAtualizacaoNaoCriaDuplicata(false, false);
      if (!resultado.ok) throw new Error("should pass");
      expect(true).toBe(true);
    });
  });

  describe("validarVinculacaoSolicitacao (RN09/RN10)", () => {
    it("passa quando solicitação não vinculada", () => {
      const resultado = validarVinculacaoSolicitacao(false, false);
      if (!resultado.ok) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha quando já vinculada sem confirmação", () => {
      const resultado = validarVinculacaoSolicitacao(true, false);
      if (resultado.ok) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "VINCULACAO_EXISTENTE"),
      ).toBe(true);
    });

    it("passa quando já vinculada com confirmação", () => {
      const resultado = validarVinculacaoSolicitacao(true, true);
      if (!resultado.ok) throw new Error("should pass");
      expect(true).toBe(true);
    });
  });
});
