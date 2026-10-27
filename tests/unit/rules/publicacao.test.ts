// tests/unit/rules/publicacao.test.ts
import { describe, it, expect } from "vitest";
import {
  validarElegibilidadePublicacao,
  validarCorrecaoDados,
  processarExpiracaoCorrecao,
  validarAtualizacaoAprovada,
} from "@/domain/rules/publicacao";

function isErro(result: {
  ok: boolean;
}): result is { ok: false; erros: Array<{ codigo: string }> } {
  return result.ok === false;
}

function isSucesso(result: { ok: boolean }): result is { ok: true } {
  return result.ok === true;
}

describe("RN26–RN34 — Publicação, correção e atualização", () => {
  describe("validarElegibilidadePublicacao (RN26, RN27, RN28)", () => {
    it("passa com todos os requisitos", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: true,
        nome: "Padaria do João",
        descricao: "Melhor pão",
        contatosValidos: 1,
        categoriasAtivas: 1,
        temEndereco: false,
        temCnpj: false,
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem aprovação vigente", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: false,
        nome: "Padaria do João",
        descricao: "Melhor pão",
        contatosValidos: 1,
        categoriasAtivas: 1,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "APROVACAO_AUSENTE"),
      ).toBe(true);
    });

    it("falha sem nome", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: true,
        nome: "",
        descricao: "Melhor pão",
        contatosValidos: 1,
        categoriasAtivas: 1,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CAMPO_OBRIGATORIO"),
      ).toBe(true);
    });

    it("falha sem descrição", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: true,
        nome: "Padaria do João",
        descricao: "",
        contatosValidos: 1,
        categoriasAtivas: 1,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CAMPO_OBRIGATORIO"),
      ).toBe(true);
    });

    it("falha sem contatos válidos", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: true,
        nome: "Padaria do João",
        descricao: "Melhor pão",
        contatosValidos: 0,
        categoriasAtivas: 1,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CONTATO_OBRIGATORIO"),
      ).toBe(true);
    });

    it("falha sem categorias ativas", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: true,
        nome: "Padaria do João",
        descricao: "Melhor pão",
        contatosValidos: 1,
        categoriasAtivas: 0,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CATEGORIA_OBRIGATORIA"),
      ).toBe(true);
    });

    it("não exige endereço (RN27)", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: true,
        nome: "Padaria do João",
        descricao: "Melhor pão",
        contatosValidos: 1,
        categoriasAtivas: 1,
        temEndereco: false,
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("não exige CNPJ (RN28)", () => {
      const resultado = validarElegibilidadePublicacao({
        temAprovacaoVigente: true,
        nome: "Padaria do João",
        descricao: "Melhor pão",
        contatosValidos: 1,
        categoriasAtivas: 1,
        temCnpj: false,
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });
  });

  describe("validarCorrecaoDados (RN29, RN30, RN31)", () => {
    it("passa com campos e prazo válido", () => {
      const resultado = validarCorrecaoDados({
        camposSolicitados: ["telefone", "endereco"],
        prazoDias: 7,
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem campos solicitados", () => {
      const resultado = validarCorrecaoDados({
        camposSolicitados: [],
        prazoDias: 7,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "CAMPOS_OBRIGATORIOS"),
      ).toBe(true);
    });

    it("falha com prazo inválido", () => {
      const resultado = validarCorrecaoDados({
        camposSolicitados: ["telefone"],
        prazoDias: 0,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(resultado.erros.some((e) => e.codigo === "PRAZO_INVALIDO")).toBe(
        true,
      );
    });
  });

  describe("processarExpiracaoCorrecao (RN32)", () => {
    it("retorna incompleta=true e excluir=false sem resposta", () => {
      const resultado = processarExpiracaoCorrecao(false);
      expect(resultado.incompleta).toBe(true);
      expect(resultado.excluir).toBe(false);
    });

    it("retorna incompleta=false com resposta", () => {
      const resultado = processarExpiracaoCorrecao(true);
      expect(resultado.incompleta).toBe(false);
      expect(resultado.excluir).toBe(false);
    });
  });

  describe("validarAtualizacaoAprovada (RN33, RN34)", () => {
    it("passa com solicitação vinculada e dados validados", () => {
      const resultado = validarAtualizacaoAprovada({
        solicitacaoVinculada: true,
        dadosValidados: true,
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem solicitação vinculada", () => {
      const resultado = validarAtualizacaoAprovada({
        solicitacaoVinculada: false,
        dadosValidados: true,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "VINCULACAO_NECESSARIA"),
      ).toBe(true);
    });

    it("falha sem dados validados", () => {
      const resultado = validarAtualizacaoAprovada({
        solicitacaoVinculada: true,
        dadosValidados: false,
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "DADOS_NAO_VALIDADOS"),
      ).toBe(true);
    });
  });
});
