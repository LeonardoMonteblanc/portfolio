// tests/unit/state-machines/anexo.test.ts
import { describe, it, expect } from "vitest";
import { transicionarAnexo } from "@/domain/state-machines/anexo";
import {
  ErroTransicaoInvalida,
  MimeInvalido,
  ArquivoMuitoGrande,
  LimiteAnexosExcedido,
} from "@/domain/errors";

describe("ME-06 — Anexo", () => {
  const contextoBase = {
    mimeType: "image/jpeg",
    tamanhoBytes: 1024 * 1024, // 1 MB
    quantidadeAtual: 0,
    formatosAceitos: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ],
    tamanhoMaximoBytes: 10 * 1024 * 1024, // 10 MB
    maxAnexos: 3,
  };

  it("UT-ME06-01: ENVIAR_ANEXO válido cria recebido", () => {
    expect(transicionarAnexo(null, "ENVIAR_ANEXO", contextoBase)).toBe(
      "recebido",
    );
  });

  it("UT-ME06-02: ENVIAR_ANEXO MIME inválido falha", () => {
    const contexto = { ...contextoBase, mimeType: "application/exe" };
    expect(() => transicionarAnexo(null, "ENVIAR_ANEXO", contexto)).toThrow(
      /Tipo MIME não aceito/,
    );
  });

  it("UT-ME06-03: ENVIAR_ANEXO arquivo muito grande falha", () => {
    const contexto = { ...contextoBase, tamanhoBytes: 11 * 1024 * 1024 };
    expect(() => transicionarAnexo(null, "ENVIAR_ANEXO", contexto)).toThrow(
      /Arquivo excede/,
    );
  });

  it("UT-ME06-04: ENVIAR_ANEXO excedendo limite de 3 anexos falha", () => {
    const contexto = { ...contextoBase, quantidadeAtual: 3 };
    expect(() => transicionarAnexo(null, "ENVIAR_ANEXO", contexto)).toThrow(
      /Máximo de 3 anexos/,
    );
  });

  it("UT-ME06-05: INICIAR_VERIFICACAO de recebido", () => {
    expect(
      transicionarAnexo("recebido", "INICIAR_VERIFICACAO", contextoBase),
    ).toBe("em_verificacao");
  });

  it("UT-ME06-06: DISPONIBILIZAR de em_verificacao", () => {
    expect(
      transicionarAnexo("em_verificacao", "DISPONIBILIZAR", contextoBase),
    ).toBe("disponivel");
  });

  it("UT-ME06-07: REJEITAR de em_verificacao", () => {
    expect(transicionarAnexo("em_verificacao", "REJEITAR", contextoBase)).toBe(
      "rejeitado",
    );
  });

  it("UT-ME06-08: PROMOVER_A_IMAGEM de disponivel mantém disponivel", () => {
    expect(
      transicionarAnexo("disponivel", "PROMOVER_A_IMAGEM", contextoBase),
    ).toBe("disponivel");
  });

  it("UT-ME06-09: Transição inválida", () => {
    expect(() =>
      transicionarAnexo("rejeitado", "DISPONIBILIZAR", contextoBase),
    ).toThrow(/Transição inválida/);
  });
});
