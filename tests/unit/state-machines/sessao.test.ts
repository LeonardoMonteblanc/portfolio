// tests/unit/state-machines/sessao.test.ts
import { describe, it, expect } from "vitest";
import { transicionarSessao } from "@/domain/state-machines/sessao";
import { ErroTransicaoInvalida } from "@/domain/errors";

describe("ME-07 — Sessão (conceitual)", () => {
  it("UT-ME07-01: LOGIN com adminId cria sessão ativa", () => {
    expect(transicionarSessao(null, "LOGIN", { adminId: "admin-1" })).toBe(
      "ativa",
    );
  });

  it("UT-ME07-02: LOGIN sem adminId falha", () => {
    expect(() => transicionarSessao(null, "LOGIN")).toThrow(
      /Transição inválida/,
    );
  });

  it("UT-ME07-03: LOGOUT encerra sessão", () => {
    expect(transicionarSessao("ativa", "LOGOUT")).toBe("encerrada");
  });

  it("UT-ME07-04: EXPIRAR após data de expiração", () => {
    const dataAtual = new Date("2025-01-15T10:00:00");
    const dataExpiracao = new Date("2025-01-14T10:00:00");
    expect(
      transicionarSessao("ativa", "EXPIRAR", { dataAtual, dataExpiracao }),
    ).toBe("expirada");
  });

  it("UT-ME07-05: EXPIRAR antes da data de expiração mantém ativa", () => {
    const dataAtual = new Date("2025-01-13T10:00:00");
    const dataExpiracao = new Date("2025-01-15T10:00:00");
    expect(
      transicionarSessao("ativa", "EXPIRAR", { dataAtual, dataExpiracao }),
    ).toBe("ativa");
  });

  it("UT-ME07-06: INVALIDAR invalida sessão", () => {
    expect(transicionarSessao("ativa", "INVALIDAR")).toBe("invalidada");
  });

  it("UT-ME07-07: Transição inválida a partir de encerrada", () => {
    expect(() => transicionarSessao("encerrada", "LOGOUT")).toThrow(
      /Transição inválida/,
    );
  });
});
