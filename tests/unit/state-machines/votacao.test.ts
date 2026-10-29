// tests/unit/state-machines/votacao.test.ts
import { describe, it, expect } from "vitest";
import {
  transicionarVotacao,
  apurarVotacao,
  aplicarSuspensaoAdmin,
  aplicarReativacaoAdmin,
} from "@/domain/state-machines/votacao";
import {
  ErroTransicaoInvalida,
  VotoDuplicado,
  QuorumIncompleto,
} from "@/domain/errors";

describe("ME-03 — Votação", () => {
  const admin1 = "admin-1";
  const admin2 = "admin-2";
  const admin3 = "admin-3";
  const adminsAtivos = new Set([admin1, admin2, admin3]);

  const criarVoto = (
    adminId: string,
    escolha: "aprovacao" | "rejeicao",
    estado: "ativo" | "inativo" | "substituido" = "ativo",
  ) => ({
    adminId,
    escolha,
    estado,
    criadoEm: new Date(),
  });

  describe("transicionarVotacao", () => {
    it("UT-ME03-01: ABRIR_VOTACAO com admins ativos", () => {
      expect(
        transicionarVotacao(null, "ABRIR_VOTACAO", { votos: [], adminsAtivos }),
      ).toBe("em_andamento");
    });

    it("UT-ME03-02: ABRIR_VOTACAO com quórum vazio permanece em_andamento", () => {
      expect(
        transicionarVotacao(null, "ABRIR_VOTACAO", {
          votos: [],
          adminsAtivos: new Set(),
        }),
      ).toBe("em_andamento");
    });

    it("UT-ME03-03: REGISTRAR_VOTO válido", () => {
      const contexto = {
        votos: [],
        adminsAtivos,
        adminId: admin1,
        escolha: "aprovacao" as const,
      };
      expect(
        transicionarVotacao("em_andamento", "REGISTRAR_VOTO", contexto),
      ).toBe("em_andamento");
    });

    it("UT-ME03-04: REGISTRAR_VOTO duplicado falha", () => {
      const votos = [criarVoto(admin1, "aprovacao")];
      const contexto = {
        votos,
        adminsAtivos,
        adminId: admin1,
        escolha: "rejeicao" as const,
      };
      expect(() =>
        transicionarVotacao("em_andamento", "REGISTRAR_VOTO", contexto),
      ).toThrow(/já votou/);
    });

    it("UT-ME03-05: REGISTRAR_VOTO admin não no quórum falha", () => {
      const contexto = {
        votos: [],
        adminsAtivos,
        adminId: "admin-inexistente",
        escolha: "aprovacao" as const,
      };
      expect(() =>
        transicionarVotacao("em_andamento", "REGISTRAR_VOTO", contexto),
      ).toThrow(/Transição inválida/);
    });

    it("UT-ME03-06: CONCLUIR_VOTACAO - maioria aprovação", () => {
      const votos = [
        criarVoto(admin1, "aprovacao"),
        criarVoto(admin2, "aprovacao"),
        criarVoto(admin3, "rejeicao"),
      ];
      const contexto = { votos, adminsAtivos };
      expect(
        transicionarVotacao("em_andamento", "CONCLUIR_VOTACAO", contexto),
      ).toBe("aprovada");
    });

    it("UT-ME03-07: CONCLUIR_VOTACAO - maioria rejeição", () => {
      const votos = [
        criarVoto(admin1, "rejeicao"),
        criarVoto(admin2, "rejeicao"),
        criarVoto(admin3, "aprovacao"),
      ];
      const contexto = { votos, adminsAtivos };
      expect(
        transicionarVotacao("em_andamento", "CONCLUIR_VOTACAO", contexto),
      ).toBe("rejeitada");
    });

    it("UT-ME03-08: CONCLUIR_VOTACAO - empate = sem_aprovacao", () => {
      // Com 2 admins: 1 aprovação, 1 rejeição = empate
      const adminsDois = new Set([admin1, admin2]);
      const votos = [
        criarVoto(admin1, "aprovacao"),
        criarVoto(admin2, "rejeicao"),
      ];
      const contexto = { votos, adminsAtivos: adminsDois };
      expect(
        transicionarVotacao("em_andamento", "CONCLUIR_VOTACAO", contexto),
      ).toBe("sem_aprovacao");
    });

    it("UT-ME03-09: CONCLUIR_VOTACAO quórum incompleto falha", () => {
      const votos = [criarVoto(admin1, "aprovacao")]; // admin2 e admin3 não votaram
      const contexto = { votos, adminsAtivos };
      expect(() =>
        transicionarVotacao("em_andamento", "CONCLUIR_VOTACAO", contexto),
      ).toThrow(/Nem todos os admins/);
    });

    it("UT-ME03-10: SUSPENDER_ADMIN mantém em_andamento", () => {
      const contexto = { votos: [], adminsAtivos, adminId: admin1 };
      expect(
        transicionarVotacao("em_andamento", "SUSPENDER_ADMIN", contexto),
      ).toBe("em_andamento");
    });

    it("UT-ME03-11: REATIVAR_ADMIN mantém em_andamento", () => {
      const contexto = { votos: [], adminsAtivos, adminId: admin1 };
      expect(
        transicionarVotacao("em_andamento", "REATIVAR_ADMIN", contexto),
      ).toBe("em_andamento");
    });

    it("UT-ME03-12: Transição inválida a partir de estado terminal", () => {
      expect(() =>
        transicionarVotacao("aprovada", "REGISTRAR_VOTO", {
          votos: [],
          adminsAtivos,
        }),
      ).toThrow(/Transição inválida/);
    });
  });

  describe("apurarVotacao", () => {
    it("retorna aprovada quando maioria aprovação", () => {
      const votos = [
        criarVoto(admin1, "aprovacao"),
        criarVoto(admin2, "aprovacao"),
        criarVoto(admin3, "rejeicao"),
      ];
      const resultado = apurarVotacao(votos, adminsAtivos);
      expect(resultado.situacao).toBe("aprovada");
      expect(resultado.aprovacoes).toBe(2);
      expect(resultado.rejeicoes).toBe(1);
      expect(resultado.quorumCompleto).toBe(true);
    });

    it("retorna rejeitada quando maioria rejeição", () => {
      const votos = [
        criarVoto(admin1, "rejeicao"),
        criarVoto(admin2, "rejeicao"),
        criarVoto(admin3, "aprovacao"),
      ];
      const resultado = apurarVotacao(votos, adminsAtivos);
      expect(resultado.situacao).toBe("rejeitada");
    });

    it("retorna sem_aprovacao em empate", () => {
      const adminsDois = new Set([admin1, admin2]);
      const votos = [
        criarVoto(admin1, "aprovacao"),
        criarVoto(admin2, "rejeicao"),
      ];
      const resultado = apurarVotacao(votos, adminsDois);
      expect(resultado.situacao).toBe("sem_aprovacao");
    });

    it("retorna em_andamento quando quórum incompleto", () => {
      const votos = [criarVoto(admin1, "aprovacao")];
      const resultado = apurarVotacao(votos, adminsAtivos);
      expect(resultado.situacao).toBe("em_andamento");
      expect(resultado.quorumCompleto).toBe(false);
    });

    it("ignora votos inativos na contagem", () => {
      // Cenário: quórum incompleto porque admin3 votou inativo
      // A função retorna cedo com aprovacoes: 0 quando quórum incompleto
      const adminsDois = new Set([admin1, admin3]);
      const votos = [
        criarVoto(admin1, "aprovacao", "ativo"),
        criarVoto(admin3, "rejeicao", "inativo"), // voto inativo
      ];
      const resultado = apurarVotacao(votos, adminsDois);
      // Quórum incompleto (admin3 não votou ativamente) -> retorna 0
      expect(resultado.aprovacoes).toBe(0);
      expect(resultado.rejeicoes).toBe(0);
      expect(resultado.situacao).toBe("em_andamento");
      expect(resultado.quorumCompleto).toBe(false);
    });
  });

  describe("aplicarSuspensaoAdmin", () => {
    it("marca voto ativo como inativo", () => {
      const votos = [criarVoto(admin1, "aprovacao", "ativo")];
      const resultado = aplicarSuspensaoAdmin(votos, admin1);
      expect(resultado[0]?.estado).toBe("inativo");
    });

    it("não altera votos já inativos", () => {
      const votos = [criarVoto(admin1, "aprovacao", "inativo")];
      const resultado = aplicarSuspensaoAdmin(votos, admin1);
      expect(resultado[0]?.estado).toBe("inativo");
    });
  });

  describe("aplicarReativacaoAdmin", () => {
    it("marca voto inativo como substituido", () => {
      const votos = [criarVoto(admin1, "aprovacao", "inativo")];
      const resultado = aplicarReativacaoAdmin(votos, admin1);
      expect(resultado[0]?.estado).toBe("substituido");
    });

    it("não altera votos ativos", () => {
      const votos = [criarVoto(admin1, "aprovacao", "ativo")];
      const resultado = aplicarReativacaoAdmin(votos, admin1);
      expect(resultado[0]?.estado).toBe("ativo");
    });
  });
});
