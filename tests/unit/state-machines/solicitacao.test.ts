// tests/unit/state-machines/solicitacao.test.ts
import { describe, it, expect } from "vitest";
import {
  transicionarSolicitacao,
  isEstadoTerminal,
  podeContestar,
  podeAnalisar,
  estaAguardandoCorrecao,
  estaIncompleta,
} from "@/domain/state-machines/solicitacao";
import {
  ErroTransicaoInvalida,
  AceiteObrigatorio,
  JustificativaObrigatoria,
  DadosIncompletos,
  DecisaoImutavel,
  ReaberturaNaoPermitida,
} from "@/domain/errors";

describe("ME-01 — Solicitação de participação", () => {
  const contextoBase = {
    adminId: "admin-1",
  };

  const contextoCompleto = {
    aceite: true,
    dadosMinimos: true,
    negocioEmContestacao: false,
    dadosCompletos: true,
    justificativa: "Justificativa válida",
    motivoErroAdmin: false,
    descricaoErro: "",
    resultadoVotacao: "aprovada" as const,
    votacaoAprovada: true,
    adminId: "admin-1",
  };

  describe("transicionarSolicitacao", () => {
    // #1, #1a, #1b - Envio de solicitação
    it("UT-ME01-01: ENVIAR_SOLICITACAO válido → recebida", () => {
      expect(
        transicionarSolicitacao(null, "ENVIAR_SOLICITACAO", contextoCompleto),
      ).toBe("recebida");
    });

    it("UT-ME01-02: ENVIAR_SOLICITACAO sem aceite falha", () => {
      const contexto = { ...contextoCompleto, aceite: false };
      expect(() =>
        transicionarSolicitacao(null, "ENVIAR_SOLICITACAO", contexto),
      ).toThrow(/aceitar os termos/);
    });

    it("UT-ME01-03: ENVIAR_SOLICITACAO sem dados mínimos falha", () => {
      const contexto = { ...contextoCompleto, dadosMinimos: false };
      expect(() =>
        transicionarSolicitacao(null, "ENVIAR_SOLICITACAO", contexto),
      ).toThrow(/Campos obrigatórios ausentes/);
    });

    it("UT-ME01-04: ENVIAR_SOLICITACAO com negócio em contestacao → em_fila_contestacao", () => {
      const contexto = { ...contextoCompleto, negocioEmContestacao: true };
      expect(
        transicionarSolicitacao(null, "ENVIAR_SOLICITACAO", contexto),
      ).toBe("em_fila_contestacao");
    });

    it("UT-ME01-05: LIBERAR_FILA após votação aprovada → recebida", () => {
      expect(
        transicionarSolicitacao("em_fila_contestacao", "LIBERAR_FILA", {
          votacaoAprovada: true,
        }),
      ).toBe("recebida");
    });

    it("UT-ME01-06: LIBERAR_FILA sem votação aprovada falha", () => {
      expect(() =>
        transicionarSolicitacao("em_fila_contestacao", "LIBERAR_FILA", {
          votacaoAprovada: false,
        }),
      ).toThrow(/Transição inválida/);
    });

    // #2 - Iniciar análise
    it("UT-ME01-07: INICIAR_ANALISE de recebida → em_analise", () => {
      expect(
        transicionarSolicitacao("recebida", "INICIAR_ANALISE", contextoBase),
      ).toBe("em_analise");
    });

    it("UT-ME01-08: INICIAR_ANALISE sem adminId falha", () => {
      expect(() =>
        transicionarSolicitacao("recebida", "INICIAR_ANALISE", {}),
      ).toThrow(/Transição inválida/);
    });

    // #3 - Solicitar correção
    it("UT-ME01-09: SOLICITAR_CORRECAO com justificativa → aguardando_correcao", () => {
      expect(
        transicionarSolicitacao("em_analise", "SOLICITAR_CORRECAO", {
          justificativa: "Dados incompletos",
        }),
      ).toBe("aguardando_correcao");
    });

    it("UT-ME01-10: SOLICITAR_CORRECAO sem justificativa falha", () => {
      expect(() =>
        transicionarSolicitacao("em_analise", "SOLICITAR_CORRECAO", {
          justificativa: "",
        }),
      ).toThrow(/Justificativa é obrigatória/);
    });

    // #4 - Receber correção
    it("UT-ME01-11: RECEBER_CORRECAO com dados completos → em_analise", () => {
      expect(
        transicionarSolicitacao("aguardando_correcao", "RECEBER_CORRECAO", {
          dadosCompletos: true,
        }),
      ).toBe("em_analise");
    });

    it("UT-ME01-12: RECEBER_CORRECAO sem dados completos falha", () => {
      expect(() =>
        transicionarSolicitacao("aguardando_correcao", "RECEBER_CORRECAO", {
          dadosCompletos: false,
        }),
      ).toThrow(/Campos obrigatórios ausentes/);
    });

    // #5 - Expirar prazo
    it("UT-ME01-13: EXPIRAR_PRAZO_CORRECAO → incompleta", () => {
      expect(
        transicionarSolicitacao(
          "aguardando_correcao",
          "EXPIRAR_PRAZO_CORRECAO",
          {},
        ),
      ).toBe("incompleta");
    });

    // #6 - Receber correção tardia
    it("UT-ME01-14: RECEBER_CORRECAO em incompleta → em_analise", () => {
      expect(
        transicionarSolicitacao("incompleta", "RECEBER_CORRECAO", {
          dadosCompletos: true,
        }),
      ).toBe("em_analise");
    });

    // #7 - Decisão de rejeição de incompleta
    it("UT-ME01-15: REGISTRAR_DECISAO_REJEICAO de incompleta → rejeitada", () => {
      expect(
        transicionarSolicitacao("incompleta", "REGISTRAR_DECISAO_REJEICAO", {
          justificativa: "Prazo vencido",
        }),
      ).toBe("rejeitada");
    });

    // #8 - Decisão de aprovação
    it("UT-ME01-16: REGISTRAR_DECISAO_APROVACAO com dados completos → aprovada", () => {
      expect(
        transicionarSolicitacao("em_analise", "REGISTRAR_DECISAO_APROVACAO", {
          dadosCompletos: true,
          justificativa: "OK",
        }),
      ).toBe("aprovada");
    });

    it("UT-ME01-17: REGISTRAR_DECISAO_APROVACAO sem dados completos falha", () => {
      expect(() =>
        transicionarSolicitacao("em_analise", "REGISTRAR_DECISAO_APROVACAO", {
          dadosCompletos: false,
          justificativa: "OK",
        }),
      ).toThrow(/Campos obrigatórios ausentes/);
    });

    it("UT-ME01-18: REGISTRAR_DECISAO_APROVACAO sem justificativa falha", () => {
      expect(() =>
        transicionarSolicitacao("em_analise", "REGISTRAR_DECISAO_APROVACAO", {
          dadosCompletos: true,
          justificativa: "",
        }),
      ).toThrow(/Justificativa é obrigatória/);
    });

    // #9 - Decisão de rejeição
    it("UT-ME01-19: REGISTRAR_DECISAO_REJEICAO → rejeitada", () => {
      expect(
        transicionarSolicitacao("em_analise", "REGISTRAR_DECISAO_REJEICAO", {
          justificativa: "Não atende critérios",
        }),
      ).toBe("rejeitada");
    });

    // #10, #11 - Contestação
    it("UT-ME01-20: ABRIR_CONTESTACAO de aprovada → em_votacao", () => {
      expect(
        transicionarSolicitacao("aprovada", "ABRIR_CONTESTACAO", {
          justificativa: "Discordo",
        }),
      ).toBe("em_votacao");
    });

    it("UT-ME01-21: ABRIR_CONTESTACAO de rejeitada → em_votacao", () => {
      expect(
        transicionarSolicitacao("rejeitada", "ABRIR_CONTESTACAO", {
          justificativa: "Discordo",
        }),
      ).toBe("em_votacao");
    });

    it("UT-ME01-22: ABRIR_CONTESTACAO sem justificativa falha", () => {
      expect(() =>
        transicionarSolicitacao("aprovada", "ABRIR_CONTESTACAO", {
          justificativa: "",
        }),
      ).toThrow(/Justificativa é obrigatória/);
    });

    // #12, #13, #14 - Concluir votação
    it("UT-ME01-23: CONCLUIR_VOTACAO aprovada → votacao_aprovada", () => {
      expect(
        transicionarSolicitacao("em_votacao", "CONCLUIR_VOTACAO", {
          resultadoVotacao: "aprovada",
        }),
      ).toBe("votacao_aprovada");
    });

    it("UT-ME01-24: CONCLUIR_VOTACAO rejeitada → votacao_rejeitada", () => {
      expect(
        transicionarSolicitacao("em_votacao", "CONCLUIR_VOTACAO", {
          resultadoVotacao: "rejeitada",
        }),
      ).toBe("votacao_rejeitada");
    });

    it("UT-ME01-25: CONCLUIR_VOTACAO empate → votacao_sem_aprovacao", () => {
      expect(
        transicionarSolicitacao("em_votacao", "CONCLUIR_VOTACAO", {
          resultadoVotacao: "sem_aprovacao",
        }),
      ).toBe("votacao_sem_aprovacao");
    });

    it("UT-ME01-26: CONCLUIR_VOTACAO resultado inválido falha", () => {
      expect(() =>
        transicionarSolicitacao("em_votacao", "CONCLUIR_VOTACAO", {
          resultadoVotacao: "invalido" as any,
        }),
      ).toThrow(/Transição inválida/);
    });

    // #15 - Reabrir por erro
    it("UT-ME01-27: REABRIR_POR_ERRO com motivo_erro_admin → em_analise", () => {
      expect(
        transicionarSolicitacao("rejeitada", "REABRIR_POR_ERRO", {
          motivoErroAdmin: true,
          descricaoErro: "Erro meu",
        }),
      ).toBe("em_analise");
    });

    it("UT-ME01-28: REABRIR_POR_ERRO sem motivo_erro_admin falha", () => {
      expect(() =>
        transicionarSolicitacao("rejeitada", "REABRIR_POR_ERRO", {
          motivoErroAdmin: false,
        }),
      ).toThrow(/Reabertura só é permitida/);
    });

    it("UT-ME01-29: REABRIR_POR_ERRO sem descrição erro falha", () => {
      expect(() =>
        transicionarSolicitacao("rejeitada", "REABRIR_POR_ERRO", {
          motivoErroAdmin: true,
          descricaoErro: "",
        }),
      ).toThrow(/Justificativa é obrigatória/);
    });

    // #16 - Cancelar por resultado
    it("UT-ME01-30: CANCELAR_POR_RESULTADO rejeitada/empate → cancelada_por_contestacao", () => {
      expect(
        transicionarSolicitacao(
          "em_fila_contestacao",
          "CANCELAR_POR_RESULTADO",
          { resultadoVotacao: "rejeitada" },
        ),
      ).toBe("cancelada_por_contestacao");
      expect(
        transicionarSolicitacao(
          "em_fila_contestacao",
          "CANCELAR_POR_RESULTADO",
          { resultadoVotacao: "sem_aprovacao" },
        ),
      ).toBe("cancelada_por_contestacao");
    });

    it("UT-ME01-31: CANCELAR_POR_RESULTADO aprovada falha", () => {
      expect(() =>
        transicionarSolicitacao(
          "em_fila_contestacao",
          "CANCELAR_POR_RESULTADO",
          { resultadoVotacao: "aprovada" },
        ),
      ).toThrow(/Transição inválida/);
    });

    // Estados terminais não aceitam transições
    it("UT-ME01-32: Transição a partir de votacao_aprovada falha", () => {
      expect(() =>
        transicionarSolicitacao("votacao_aprovada", "REABRIR_POR_ERRO", {
          motivoErroAdmin: true,
          descricaoErro: "x",
        }),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME01-33: Transição a partir de votacao_rejeitada falha", () => {
      expect(() =>
        transicionarSolicitacao("votacao_rejeitada", "ABRIR_CONTESTACAO", {
          justificativa: "x",
        }),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME01-34: Transição a partir de votacao_sem_aprovacao falha", () => {
      expect(() =>
        transicionarSolicitacao("votacao_sem_aprovacao", "CONCLUIR_VOTACAO", {
          resultadoVotacao: "aprovada",
        }),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME01-35: Transição a partir de cancelada_por_contestacao falha", () => {
      expect(() =>
        transicionarSolicitacao("cancelada_por_contestacao", "LIBERAR_FILA", {
          votacaoAprovada: true,
        }),
      ).toThrow(/Transição inválida/);
    });
  });

  describe("isEstadoTerminal", () => {
    it("retorna true para estados terminais", () => {
      expect(isEstadoTerminal("votacao_aprovada")).toBe(true);
      expect(isEstadoTerminal("votacao_rejeitada")).toBe(true);
      expect(isEstadoTerminal("votacao_sem_aprovacao")).toBe(true);
      expect(isEstadoTerminal("cancelada_por_contestacao")).toBe(true);
    });

    it("retorna false para estados não terminais", () => {
      expect(isEstadoTerminal("recebida")).toBe(false);
      expect(isEstadoTerminal("em_analise")).toBe(false);
      expect(isEstadoTerminal("aguardando_correcao")).toBe(false);
      expect(isEstadoTerminal("incompleta")).toBe(false);
      expect(isEstadoTerminal("aprovada")).toBe(false);
      expect(isEstadoTerminal("rejeitada")).toBe(false);
      expect(isEstadoTerminal("em_votacao")).toBe(false);
      expect(isEstadoTerminal("em_fila_contestacao")).toBe(false);
    });
  });

  describe("podeContestar", () => {
    it("retorna true para aprovada com origem individual", () => {
      expect(podeContestar("aprovada", "individual")).toBe(true);
    });

    it("retorna true para rejeitada com origem individual", () => {
      expect(podeContestar("rejeitada", "individual")).toBe(true);
    });

    it("retorna false para decisão de votação (RN24)", () => {
      expect(podeContestar("aprovada", "votacao")).toBe(false);
      expect(podeContestar("rejeitada", "votacao")).toBe(false);
    });

    it("retorna false para outros estados", () => {
      expect(podeContestar("recebida", "individual")).toBe(false);
      expect(podeContestar("em_analise", "individual")).toBe(false);
    });
  });

  describe("podeAnalisar", () => {
    it("retorna true para recebida", () => {
      expect(podeAnalisar("recebida")).toBe(true);
    });

    it("retorna true para em_fila_contestacao", () => {
      expect(podeAnalisar("em_fila_contestacao")).toBe(true);
    });

    it("retorna false para outros", () => {
      expect(podeAnalisar("em_analise")).toBe(false);
      expect(podeAnalisar("aprovada")).toBe(false);
    });
  });

  describe("estaAguardandoCorrecao", () => {
    it("retorna true apenas para aguardando_correcao", () => {
      expect(estaAguardandoCorrecao("aguardando_correcao")).toBe(true);
      expect(estaAguardandoCorrecao("em_analise")).toBe(false);
    });
  });

  describe("estaIncompleta", () => {
    it("retorna true apenas para incompleta", () => {
      expect(estaIncompleta("incompleta")).toBe(true);
      expect(estaIncompleta("aguardando_correcao")).toBe(false);
    });
  });
});
