// tests/unit/state-machines/publicacao.test.ts
import { describe, it, expect } from "vitest";
import {
  transicionarPublicacao,
  validarElegibilidade,
  obterMotivosInelegibilidade,
  lancarErroInelegibilidade,
} from "@/domain/state-machines/publicacao";
import {
  ErroTransicaoInvalida,
  AprovacaoAusente,
  ContatoObrigatorio,
  CategoriaObrigatoria,
  DadosIncompletos,
} from "@/domain/errors";

const contextoElegivel = {
  temAprovacaoVigente: true,
  temContatoValido: true,
  temCategoriaAtiva: true,
  temNome: true,
  temDescricao: true,
  motivoInvalidez: "aprovacao_ausente" as const,
};

const contextoInelegivel = {
  temAprovacaoVigente: false,
  temContatoValido: false,
  temCategoriaAtiva: false,
  temNome: false,
  temDescricao: false,
  motivoInvalidez: "aprovacao_ausente" as const,
};

describe("ME-02 — Publicação do negócio", () => {
  describe("transicionarPublicacao", () => {
    it("UT-ME02-01: CRIAR_NEGOCIO cria nao_elegivel", () => {
      expect(
        transicionarPublicacao(null, "CRIAR_NEGOCIO", contextoElegivel),
      ).toBe("nao_elegivel");
    });

    it("UT-ME02-02: TORNAR_ELEGIVEL com todos requisitos → nao_publicado", () => {
      expect(
        transicionarPublicacao(
          "nao_elegivel",
          "TORNAR_ELEGIVEL",
          contextoElegivel,
        ),
      ).toBe("nao_publicado");
    });

    it("UT-ME02-03: TORNAR_ELEGIVEL sem contato falha", () => {
      const contexto = { ...contextoElegivel, temContatoValido: false };
      expect(() =>
        transicionarPublicacao("nao_elegivel", "TORNAR_ELEGIVEL", contexto),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME02-04: TORNAR_ELEGIVEL sem categoria falha", () => {
      const contexto = { ...contextoElegivel, temCategoriaAtiva: false };
      expect(() =>
        transicionarPublicacao("nao_elegivel", "TORNAR_ELEGIVEL", contexto),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME02-05: TORNAR_ELEGIVEL sem aprovação falha", () => {
      const contexto = { ...contextoElegivel, temAprovacaoVigente: false };
      expect(() =>
        transicionarPublicacao("nao_elegivel", "TORNAR_ELEGIVEL", contexto),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME02-06: PUBLICAR de nao_publicado elegível → publicado", () => {
      expect(
        transicionarPublicacao("nao_publicado", "PUBLICAR", contextoElegivel),
      ).toBe("publicado");
    });

    it("UT-ME02-07: DESPUBLICAR → nao_publicado", () => {
      expect(
        transicionarPublicacao("publicado", "DESPUBLICAR", contextoElegivel),
      ).toBe("nao_publicado");
    });

    it("UT-ME02-08: OCULTAR_POR_CONTESTACAO de publicado → oculto_contestacao", () => {
      expect(
        transicionarPublicacao(
          "publicado",
          "OCULTAR_POR_CONTESTACAO",
          contextoElegivel,
        ),
      ).toBe("oculto_contestacao");
    });

    it("UT-ME02-09: VOTACAO_APROVADA de oculto_contestacao → publicado", () => {
      expect(
        transicionarPublicacao(
          "oculto_contestacao",
          "VOTACAO_APROVADA",
          contextoElegivel,
        ),
      ).toBe("publicado");
    });

    it("UT-ME02-10: VOTACAO_NAO_APROVADA de oculto_contestacao → nao_publicado", () => {
      expect(
        transicionarPublicacao(
          "oculto_contestacao",
          "VOTACAO_NAO_APROVADA",
          contextoElegivel,
        ),
      ).toBe("nao_publicado");
    });

    it("UT-ME02-11: INVALIDAR de publicado com motivo → nao_elegivel", () => {
      const contexto = {
        ...contextoElegivel,
        motivoInvalidez: "contato_invalido" as const,
      };
      expect(transicionarPublicacao("publicado", "INVALIDAR", contexto)).toBe(
        "nao_elegivel",
      );
    });

    it("UT-ME02-12: INVALIDAR sem motivo falha", () => {
      expect(() =>
        transicionarPublicacao("publicado", "INVALIDAR", {
          ...contextoElegivel,
          motivoInvalidez: undefined,
        }),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME02-13: Transição inválida", () => {
      expect(() =>
        transicionarPublicacao(
          "publicado",
          "TORNAR_ELEGIVEL",
          contextoElegivel,
        ),
      ).toThrow(/Transição inválida/);
    });
  });

  describe("validarElegibilidade", () => {
    it("retorna true quando todos requisitos atendidos", () => {
      expect(validarElegibilidade(contextoElegivel)).toBe(true);
    });

    it("retorna false quando falta aprovação", () => {
      expect(
        validarElegibilidade({
          ...contextoElegivel,
          temAprovacaoVigente: false,
        }),
      ).toBe(false);
    });

    it("retorna false quando falta contato", () => {
      expect(
        validarElegibilidade({ ...contextoElegivel, temContatoValido: false }),
      ).toBe(false);
    });

    it("retorna false quando falta categoria", () => {
      expect(
        validarElegibilidade({ ...contextoElegivel, temCategoriaAtiva: false }),
      ).toBe(false);
    });

    it("retorna false quando falta nome", () => {
      expect(
        validarElegibilidade({ ...contextoElegivel, temNome: false }),
      ).toBe(false);
    });

    it("retorna false quando falta descrição", () => {
      expect(
        validarElegibilidade({ ...contextoElegivel, temDescricao: false }),
      ).toBe(false);
    });
  });

  describe("obterMotivosInelegibilidade", () => {
    it("lista todos os motivos faltantes", () => {
      const motivos = obterMotivosInelegibilidade(contextoInelegivel);
      expect(motivos).toContain("aprovacao_ausente");
      expect(motivos).toContain("contato_invalido");
      expect(motivos).toContain("categoria_removida");
      expect(motivos).toContain("dados_incompletos");
    });

    it("lista vazio quando elegível", () => {
      expect(obterMotivosInelegibilidade(contextoElegivel)).toEqual([]);
    });
  });

  describe("lancarErroInelegibilidade", () => {
    it("lança AprovacaoAusente primeiro", () => {
      expect(() =>
        lancarErroInelegibilidade({
          ...contextoElegivel,
          temAprovacaoVigente: false,
        }),
      ).toThrow(/aprovação vigente/);
    });

    it("lança ContatoObrigatorio", () => {
      expect(() =>
        lancarErroInelegibilidade({
          ...contextoElegivel,
          temContatoValido: false,
        }),
      ).toThrow(/contato válido/);
    });

    it("lança CategoriaObrigatoria", () => {
      expect(() =>
        lancarErroInelegibilidade({
          ...contextoElegivel,
          temCategoriaAtiva: false,
        }),
      ).toThrow(/categoria ativa/);
    });

    it("lança DadosIncompletos com campos corretos", () => {
      try {
        lancarErroInelegibilidade({
          ...contextoElegivel,
          temNome: false,
          temDescricao: false,
        });
      } catch (e: any) {
        expect(e.campos).toContain("nome");
        expect(e.campos).toContain("descricao");
      }
    });
  });
});
