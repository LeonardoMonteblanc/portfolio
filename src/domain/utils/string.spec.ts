// src/domain/utils/string.spec.ts
import { describe, it, expect } from "vitest";
import { normalizeSearch, generateSlug } from "./string";

describe("Utilitários de String", () => {
  it("deve normalizar texto removendo acentos e maiúsculas", () => {
    expect(normalizeSearch("Padaria do João")).toBe("padaria do joao");
    expect(normalizeSearch("  AÇÃO  ")).toBe("acao");
  });

  it("deve gerar slug válido", () => {
    expect(generateSlug("Padaria do João!")).toBe("padaria-do-joao");
    expect(generateSlug("  Café & Cia ")).toBe("cafe-cia");
    expect(generateSlug("---Teste---")).toBe("teste");
  });
});
