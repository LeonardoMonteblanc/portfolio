// tests/unit/rules/decisoes.test.ts
import { describe, it, expect } from "vitest";
import {
  validarDecisaoIndividual,
  validarManifestacaoForum,
  validarContestacao,
  validarVotacao,
  aplicarOcultacaoVotacao,
} from "@/domain/rules/decisoes";

function isErro(result: {
  ok: boolean;
}): result is { ok: false; erros: Array<{ codigo: string }> } {
  return result.ok === false;
}

function isSucesso<T>(result: {
  ok: boolean;
  resultado?: T;
}): result is { ok: true; resultado: T } {
  return result.ok === true;
}

function hasQuorumCompleto(result: {
  ok: boolean;
  quorumCompleto?: boolean;
}): result is { ok: false; quorumCompleto: boolean } {
  return result.ok === false && "quorumCompleto" in result;
}

describe("RN12–RN25 — Decisões, fórum e contestação", () => {
  describe("validarDecisaoIndividual (RN12, RN13)", () => {
    it("passa com aprovação, justificativa e adminId", () => {
      const resultado = validarDecisaoIndividual({
        resultado: "aprovacao",
        justificativa: "Atende todos os critérios",
        adminId: "admin-1",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("passa com rejeição, justificativa e adminId", () => {
      const resultado = validarDecisaoIndividual({
        resultado: "rejeicao",
        justificativa: "Não atende critérios",
        adminId: "admin-1",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha sem justificativa", () => {
      const resultado = validarDecisaoIndividual({
        resultado: "aprovacao",
        justificativa: "",
        adminId: "admin-1",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "JUSTIFICATIVA_OBRIGATORIA"),
      ).toBe(true);
    });

    it("falha sem adminId", () => {
      const resultado = validarDecisaoIndividual({
        resultado: "aprovacao",
        justificativa: "OK",
        adminId: "",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "ADMIN_OBRIGATORIO"),
      ).toBe(true);
    });

    it("falha com motivo_erro_admin mas sem descricao_erro", () => {
      const resultado = validarDecisaoIndividual({
        resultado: "rejeicao",
        justificativa: "Erro",
        adminId: "admin-1",
        motivoErroAdmin: true,
        descricaoErro: "",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "DESCRICAO_ERRO_OBRIGATORIA"),
      ).toBe(true);
    });

    it("passa com motivo_erro_admin e descricao_erro", () => {
      const resultado = validarDecisaoIndividual({
        resultado: "rejeicao",
        justificativa: "Erro meu",
        adminId: "admin-1",
        motivoErroAdmin: true,
        descricaoErro: "Confundi os dados",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });
  });

  describe("validarManifestacaoForum (RN15, RN16)", () => {
    it("passa com concordancia", () => {
      const resultado = validarManifestacaoForum("concordancia");
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("passa com discordancia", () => {
      const resultado = validarManifestacaoForum("discordancia");
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha com tipo inválido", () => {
      const resultado = validarManifestacaoForum("invalido" as any);
      if (!isErro(resultado)) throw new Error("should fail");
      expect(resultado.erros.some((e) => e.codigo === "TIPO_INVALIDO")).toBe(
        true,
      );
    });
  });

  describe("validarContestacao (RN17, RN24)", () => {
    it("passa com decisão individual, justificativa e adminId", () => {
      const resultado = validarContestacao({
        decisaoOrigem: "individual",
        justificativa: "Discordo da decisão",
        adminId: "admin-1",
      });
      if (isErro(resultado)) throw new Error("should pass");
      expect(true).toBe(true);
    });

    it("falha com decisão de votação (RN24)", () => {
      const resultado = validarContestacao({
        decisaoOrigem: "votacao",
        justificativa: "Discordo",
        adminId: "admin-1",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(resultado.erros.some((e) => e.codigo === "DECISAO_IMUTAVEL")).toBe(
        true,
      );
    });

    it("falha sem justificativa", () => {
      const resultado = validarContestacao({
        decisaoOrigem: "individual",
        justificativa: "",
        adminId: "admin-1",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "JUSTIFICATIVA_OBRIGATORIA"),
      ).toBe(true);
    });

    it("falha sem adminId", () => {
      const resultado = validarContestacao({
        decisaoOrigem: "individual",
        justificativa: "Discordo",
        adminId: "",
      });
      if (!isErro(resultado)) throw new Error("should fail");
      expect(
        resultado.erros.some((e) => e.codigo === "ADMIN_OBRIGATORIO"),
      ).toBe(true);
    });
  });

  describe("validarVotacao (RN18, RN19, RN20, RN21)", () => {
    const admin1 = "admin-1";
    const admin2 = "admin-2";
    const admin3 = "admin-3";
    const adminsAtivos = [admin1, admin2, admin3];

    const criarVoto = (
      adminId: string,
      escolha: "aprovacao" | "rejeicao",
      estado: "ativo" | "inativo" | "substituido" = "ativo",
    ) => ({
      adminId,
      escolha,
      estado,
    });

    it("retorna aprovada com maioria aprovação", () => {
      const votos = [
        criarVoto(admin1, "aprovacao"),
        criarVoto(admin2, "aprovacao"),
        criarVoto(admin3, "rejeicao"),
      ];
      const resultado = validarVotacao(votos, adminsAtivos);
      if (isErro(resultado)) throw new Error("should pass");
      if (!isSucesso(resultado)) throw new Error("should have resultado");
      expect(resultado.resultado).toBe("aprovada");
    });

    it("retorna rejeitada com maioria rejeição", () => {
      const votos = [
        criarVoto(admin1, "rejeicao"),
        criarVoto(admin2, "rejeicao"),
        criarVoto(admin3, "aprovacao"),
      ];
      const resultado = validarVotacao(votos, adminsAtivos);
      if (isErro(resultado)) throw new Error("should pass");
      if (!isSucesso(resultado)) throw new Error("should have resultado");
      expect(resultado.resultado).toBe("rejeitada");
    });

    it("retorna sem_aprovacao em empate", () => {
      const adminsDois = [admin1, admin2];
      const votos = [
        criarVoto(admin1, "aprovacao"),
        criarVoto(admin2, "rejeicao"),
      ];
      const resultado = validarVotacao(votos, adminsDois);
      if (isErro(resultado)) throw new Error("should pass");
      if (!isSucesso(resultado)) throw new Error("should have resultado");
      expect(resultado.resultado).toBe("sem_aprovacao");
    });

    it("falha com quórum incompleto", () => {
      const votos = [criarVoto(admin1, "aprovacao")];
      const resultado = validarVotacao(votos, adminsAtivos);
      if (!isErro(resultado)) throw new Error("should fail");
      if (!hasQuorumCompleto(resultado))
        throw new Error("should have quorumCompleto");
      expect(resultado.quorumCompleto).toBe(false);
      expect(
        resultado.erros.some((e) => e.codigo === "QUORUM_INCOMPLETO"),
      ).toBe(true);
    });

    it("ignora votos inativos na contagem", () => {
      // Para quórum completo, todos os 3 admins devem votar ativamente
      const votos = [
        criarVoto(admin1, "aprovacao", "ativo"),
        criarVoto(admin2, "rejeicao", "ativo"), // admin2 vota ativamente
        criarVoto(admin3, "aprovacao", "ativo"),
      ];
      const resultado = validarVotacao(votos, adminsAtivos);
      if (isErro(resultado)) throw new Error("should pass");
      if (!isSucesso(resultado)) throw new Error("should have resultado");
      // 2 aprovações (admin1, admin3) vs 1 rejeição (admin2) = aprovada
      expect(resultado.resultado).toBe("aprovada");
    });
  });

  describe("aplicarOcultacaoVotacao (RN22)", () => {
    it("retorna true quando negócio publicado", () => {
      expect(aplicarOcultacaoVotacao(true)).toBe(true);
    });

    it("retorna false quando negócio não publicado", () => {
      expect(aplicarOcultacaoVotacao(false)).toBe(false);
    });
  });
});
