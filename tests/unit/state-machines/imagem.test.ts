// tests/unit/state-machines/imagem.test.ts
import { describe, it, expect } from "vitest";
import { transicionarImagem } from "@/domain/state-machines/imagem";
import {
  ErroTransicaoInvalida,
  JustificativaObrigatoria,
  LimiteExcedido,
  ArquivoMuitoGrande,
} from "@/domain/errors";

describe("ME-05 — Imagem", () => {
  const contextoBase = {
    tipo: "logo" as const,
    tamanhoBytes: 1024 * 1024, // 1 MB
    quantidadeAtualLogo: 0,
    quantidadeAtualFotos: 0,
    formatosAceitos: ["jpg", "png", "webp"],
    tamanhoMaximoBytes: 10 * 1024 * 1024, // 10 MB
  };

  it("UT-ME05-01: ENVIAR_IMAGEM com formato válido cria pendente", () => {
    expect(transicionarImagem(null, "ENVIAR_IMAGEM", contextoBase)).toBe(
      "pendente",
    );
  });

  it("UT-ME05-02: ENVIAR_IMAGEM excedendo limite de logo falha", () => {
    const contexto = { ...contextoBase, quantidadeAtualLogo: 1 };
    expect(() => transicionarImagem(null, "ENVIAR_IMAGEM", contexto)).toThrow(
      /Limite excedido/,
    );
  });

  it("UT-ME05-03: ENVIAR_IMAGEM excedendo limite de fotos falha", () => {
    const contexto = {
      ...contextoBase,
      tipo: "foto" as const,
      quantidadeAtualFotos: 3,
    };
    expect(() => transicionarImagem(null, "ENVIAR_IMAGEM", contexto)).toThrow(
      /Limite excedido/,
    );
  });

  it("UT-ME05-04: ENVIAR_IMAGEM arquivo muito grande falha", () => {
    const contexto = { ...contextoBase, tamanhoBytes: 11 * 1024 * 1024 }; // 11 MB
    expect(() => transicionarImagem(null, "ENVIAR_IMAGEM", contexto)).toThrow(
      /Arquivo excede/,
    );
  });

  it("UT-ME05-05: APROVAR_IMAGEM de pendente", () => {
    expect(transicionarImagem("pendente", "APROVAR_IMAGEM", contextoBase)).toBe(
      "aprovada",
    );
  });

  it("UT-ME05-06: REJEITAR_IMAGEM sem justificativa falha", () => {
    expect(() =>
      transicionarImagem("pendente", "REJEITAR_IMAGEM", contextoBase),
    ).toThrow(/Justificativa é obrigatória/);
  });

  it("UT-ME05-07: REJEITAR_IMAGEM com justificativa", () => {
    expect(
      transicionarImagem("pendente", "REJEITAR_IMAGEM", {
        ...contextoBase,
        justificativa: "Qualidade baixa",
      }),
    ).toBe("rejeitada");
  });

  it("UT-ME05-08: Transição inválida a partir de aprovada", () => {
    expect(() =>
      transicionarImagem("aprovada", "REJEITAR_IMAGEM", contextoBase),
    ).toThrow(/Transição inválida/);
  });

  it("UT-ME05-09: Transição inválida a partir de rejeitada", () => {
    expect(() =>
      transicionarImagem("rejeitada", "APROVAR_IMAGEM", contextoBase),
    ).toThrow(/Transição inválida/);
  });
});
