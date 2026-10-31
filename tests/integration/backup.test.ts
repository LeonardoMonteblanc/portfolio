import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executarBackup } from "@/application/backup/backup.service";
import {
  carregarManifesto,
  restaurarBackup,
} from "@/application/backup/restaurar";
import { destinoDiretorio } from "@/infrastructure/backup/destino";
import { sqlBruto } from "@/infrastructure/db/client";
import { limparBanco } from "./setup";

/**
 * F9-11 / RNF-027 — backup e restauração de verdade, contra Postgres real.
 *
 * O teste faz o ciclo completo: exporta o banco de teste, cria um banco novo do
 * zero (só migrations), restaura e compara contagem por tabela com o manifesto.
 * É o drill de restauração automatizado — se o formato do dump quebrar, aqui
 * aparece antes de alguém precisar dele num incidente.
 */
const SCRATCH = "diretorio_test_restore";

function urlBanco(nome: string): string {
  const base = new URL(process.env.DATABASE_URL!);
  base.pathname = `/${nome}`;
  return base.toString();
}

function urlAdmin(): string {
  const base = new URL(process.env.DATABASE_URL!);
  base.pathname = "/postgres";
  return base.toString();
}

describe("backup e restauração", () => {
  let diretorio: string;

  beforeAll(async () => {
    diretorio = await mkdtemp(path.join(tmpdir(), "backup-teste-"));
    await limparBanco();

    // Dados mínimos para o dump ter o que provar.
    await sqlBruto.unsafe(
      `insert into categoria (nome, slug, ativa) values
         ('Padarias', 'padarias', true),
         ('Mercados', 'mercados', true)`,
    );
  });

  afterAll(async () => {
    await rm(diretorio, { recursive: true, force: true });
  });

  it("exporta todas as tabelas com manifesto íntegro", async () => {
    const destino = destinoDiretorio(diretorio);
    const resultado = await executarBackup({
      destino,
      retencaoDias: 0,
      agora: new Date("2026-02-04T03:30:00Z"),
    });

    expect(resultado.data).toBe("2026-02-04");
    expect(resultado.tabelas).toBeGreaterThan(20);

    const { manifesto } = await carregarManifesto(destino, "2026-02-04");

    expect(manifesto.versao).toBe(1);
    expect(manifesto.totais.tabelas).toBe(resultado.tabelas);
    expect(manifesto.tabelas.map((t) => t.nome)).toContain("categoria");

    const categorias = manifesto.tabelas.find((t) => t.nome === "categoria");
    expect(categorias?.linhas).toBe(2);

    // Cada arquivo precisa bater com o hash do manifesto e descomprimir na
    // mesma quantidade de linhas — é o que garante restauração fiel.
    for (const tabela of manifesto.tabelas) {
      const conteudo = await destino.ler(tabela.arquivo);
      const sha = createHash("sha256").update(conteudo).digest("hex");
      expect(sha, tabela.arquivo).toBe(tabela.sha256);

      const linhas = gunzipSync(conteudo)
        .toString("utf8")
        .split("\n")
        .filter((linha) => linha.trim().length > 0);
      expect(linhas.length, tabela.arquivo).toBe(tabela.linhas);
    }
  });

  it("restaura em banco novo e fecha as contagens", async () => {
    const destino = destinoDiretorio(diretorio);
    const { manifesto } = await carregarManifesto(destino, "2026-02-04");

    const admin = postgres(urlAdmin(), { prepare: false, max: 1 });
    try {
      await admin.unsafe(
        `select pg_terminate_backend(pid) from pg_stat_activity where datname = '${SCRATCH}'`,
      );
      await admin.unsafe(`drop database if exists "${SCRATCH}"`);
      await admin.unsafe(`create database "${SCRATCH}"`);
    } finally {
      await admin.end({ timeout: 5 });
    }

    const cliente = postgres(urlBanco(SCRATCH), { prepare: false, max: 1 });
    try {
      const db = drizzle(cliente);
      await migrate(db, {
        migrationsFolder: path.resolve(
          process.cwd(),
          "src/infrastructure/db/migrations",
        ),
      });

      // 1) arquivo corrompido precisa ser recusado antes de tocar nos dados
      const tabelaCorrompida = manifesto.tabelas[0]!;
      await expect(
        restaurarBackup({
          cliente,
          manifesto,
          limparTabelas: true,
          lerArquivo: async (chave) => {
            const original = await destino.ler(chave);
            if (chave !== tabelaCorrompida.arquivo) return original;
            const alterado = Buffer.from(original);
            const ultima = alterado.length - 1;
            alterado[ultima] = (alterado[ultima] ?? 0) ^ 0xff;
            return alterado;
          },
        }),
      ).rejects.toThrow(/corrompido/);

      // 2) restauração real
      const resultado = await restaurarBackup({
        cliente,
        manifesto,
        limparTabelas: true,
        lerArquivo: (chave) => destino.ler(chave),
      });

      expect(resultado.divergencias).toEqual([]);
      expect(resultado.chavesEstrangeirasRecriadas).toBeGreaterThan(0);

      const contagem = await cliente.unsafe<Array<{ total: number }>>(
        "select count(*)::int as total from categoria",
      );
      expect(contagem[0]?.total).toBe(2);

      const nomes = await cliente.unsafe<Array<{ nome: string }>>(
        "select nome from categoria order by nome",
      );
      expect(nomes.map((linha) => linha.nome)).toEqual([
        "Mercados",
        "Padarias",
      ]);

      // FKs voltaram: inserir categoria duplicada de slug deve falhar.
      await expect(
        cliente.unsafe(
          "insert into categoria (nome, slug, ativa) values ('X', 'padarias', true)",
        ),
      ).rejects.toThrow();
    } finally {
      await cliente.end({ timeout: 5 });
    }

    const adminFinal = postgres(urlAdmin(), { prepare: false, max: 1 });
    try {
      await adminFinal.unsafe(
        `select pg_terminate_backend(pid) from pg_stat_activity where datname = '${SCRATCH}'`,
      );
      await adminFinal.unsafe(`drop database if exists "${SCRATCH}"`);
    } finally {
      await adminFinal.end({ timeout: 5 });
    }
  });
});
