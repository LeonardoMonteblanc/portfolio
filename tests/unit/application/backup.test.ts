import { describe, expect, it, vi } from "vitest";
import { ordenarPorDependencia } from "@/application/backup/ordem";
import { aplicarRetencao } from "@/application/backup/retencao";
import { prefixoDoDia } from "@/application/backup/tipos";
import type { DestinoBackup } from "@/infrastructure/backup/destino";

/**
 * F9-11 — partes puras do backup: ordem de restauração, retenção e prefixo.
 * Nada aqui toca banco ou rede (o round-trip real fica no teste de integração).
 */
describe("ordem de restauração", () => {
  it("coloca a tabela referenciada antes de quem a referencia", () => {
    const ordem = ordenarPorDependencia(
      ["solicitacao", "solicitante", "negocio"],
      [
        { tabela: "solicitacao", referencia: "negocio" },
        { tabela: "solicitacao", referencia: "solicitante" },
      ],
    );

    expect(ordem.indexOf("negocio")).toBeLessThan(ordem.indexOf("solicitacao"));
    expect(ordem.indexOf("solicitante")).toBeLessThan(
      ordem.indexOf("solicitacao"),
    );
  });

  it("ignora auto-referência (categoria pai/filho)", () => {
    const ordem = ordenarPorDependencia(
      ["categoria", "negocio"],
      [{ tabela: "categoria", referencia: "categoria" }],
    );

    expect(ordem).toEqual(["categoria", "negocio"]);
  });

  it("não entra em laço com ciclo de chaves estrangeiras", () => {
    const ordem = ordenarPorDependencia(
      ["a", "b", "c"],
      [
        { tabela: "a", referencia: "b" },
        { tabela: "b", referencia: "c" },
        { tabela: "c", referencia: "a" },
      ],
    );

    expect(ordem.sort()).toEqual(["a", "b", "c"]);
  });

  it("ignora dependência de tabela fora do backup", () => {
    const ordem = ordenarPorDependencia(
      ["negocio"],
      [{ tabela: "negocio", referencia: "tabela_que_nao_exportei" }],
    );

    expect(ordem).toEqual(["negocio"]);
  });

  it("preserva todas as tabelas mesmo quando a ordem parcial já resolve", () => {
    const tabelas = ["log_login", "configuracao", "job", "negocio"];
    const ordem = ordenarPorDependencia(tabelas, []);

    expect(ordem).toEqual([...tabelas].sort());
  });
});

function destinoFalso(chaves: string[]): {
  destino: DestinoBackup;
  removidas: string[];
} {
  const removidas: string[] = [];

  const destino: DestinoBackup = {
    nome: "diretorio",
    descricao: "memória",
    enviar: vi.fn(),
    ler: vi.fn(),
    listar: vi.fn(async () => chaves),
    remover: vi.fn(async (alvo: string[]) => {
      removidas.push(...alvo);
    }),
  };

  return { destino, removidas };
}

describe("retenção do backup", () => {
  const agora = new Date("2026-02-10T03:30:00Z");

  it("remove dias mais antigos que a janela e mantém o resto", async () => {
    const { destino, removidas } = destinoFalso([
      "backups/2026-01-01/tabelas/negocio.ndjson.gz",
      "backups/2026-01-01/manifesto.json",
      "backups/2026-02-09/manifesto.json",
      "backups/2026-02-10/manifesto.json",
    ]);

    const expiradas = await aplicarRetencao(destino, 30, agora);

    expect(expiradas).toEqual([
      "backups/2026-01-01/tabelas/negocio.ndjson.gz",
      "backups/2026-01-01/manifesto.json",
    ]);
    expect(removidas).toHaveLength(2);
  });

  it("não apaga arquivo fora do padrão de data", async () => {
    const { destino, removidas } = destinoFalso([
      "backups/rascunho/manifesto.json",
      "backups/2026-02-10/manifesto.json",
    ]);

    await aplicarRetencao(destino, 30, agora);

    expect(removidas).toEqual([]);
  });

  it("retenção zero desliga a limpeza", async () => {
    const { destino } = destinoFalso(["backups/2020-01-01/manifesto.json"]);

    expect(await aplicarRetencao(destino, 0, agora)).toEqual([]);
    expect(destino.remover).not.toHaveBeenCalled();
  });
});

describe("prefixo do dia", () => {
  it("usa a data ISO como pasta", () => {
    expect(prefixoDoDia("2026-02-04")).toBe("backups/2026-02-04/");
  });
});
