// tests/unit/state-machines/sugestao.test.ts
import { describe, it, expect } from "vitest";
import { transicionarSugestao } from "@/domain/state-machines/sugestao";
import {
  ErroTransicaoInvalida,
  JustificativaObrigatoria,
} from "@/domain/errors";

describe("ME-08 — Sugestão de categoria", () => {
  it("UT-ME08-01: REGISTRAR_SUGESTAO cria sugestão pendente", () => {
    expect(transicionarSugestao(null, "REGISTRAR_SUGESTAO")).toBe("pendente");
  });

  it("UT-ME08-02: ACEITAR_SUGESTAO com admin", () => {
    expect(
      transicionarSugestao("pendente", "ACEITAR_SUGESTAO", {
        adminId: "admin-1",
      }),
    ).toBe("aceita");
  });

  it("UT-ME08-03: ACEITAR_SUGESTAO sem admin falha", () => {
    expect(() => transicionarSugestao("pendente", "ACEITAR_SUGESTAO")).toThrow(
      /Transição inválida/,
    );
  });

  it("UT-ME08-04: REJEITAR_SUGESTAO sem justificativa falha", () => {
    expect(() => transicionarSugestao("pendente", "REJEITAR_SUGESTAO")).toThrow(
      /Justificativa é obrigatória/,
    );
  });

  it("UT-ME08-05: REJEITAR_SUGESTAO com justificativa", () => {
    expect(
      transicionarSugestao("pendente", "REJEITAR_SUGESTAO", {
        justificativa: "Duplicada",
      }),
    ).toBe("rejeitada");
  });

  it("UT-ME08-06: Transição inválida de estado terminal aceita", () => {
    expect(() => transicionarSugestao("aceita", "REJEITAR_SUGESTAO")).toThrow(
      /Transição inválida/,
    );
  });

  it("UT-ME08-07: Transição inválida de estado terminal rejeitada", () => {
    expect(() =>
      transicionarSugestao("rejeitada", "ACEITAR_SUGESTAO", {
        adminId: "admin-1",
      }),
    ).toThrow(/Transição inválida/);
  });
});
