// src/scripts/restaurar-backup.ts
import postgres from "postgres";
import { sqlBruto } from "@/infrastructure/db/client";
import {
  carregarManifesto,
  restaurarBackup,
} from "@/application/backup/restaurar";
import { destinoDiretorio } from "@/infrastructure/backup/destino";

/**
 * Drill de restauração (RNF-027).
 *
 * Uso:
 *   pnpm db:restore --dir backups                # usa o manifesto mais recente
 *   pnpm db:restore --dir backups --dia 2026-02-04
 *   pnpm db:restore --db postgresql://dev:dev@localhost:5432/restore --limpar --confirmar
 *
 * Trava de segurança: recusa host que não seja local. Restaurar por engano em
 * cima do Neon de produção apagaria a base inteira, e `--limpar` só roda com
 * `--confirmar` explícito.
 */

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

function argumento(nome: string): string | undefined {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function principal(): Promise<void> {
  const url = argumento("db") ?? process.env.DATABASE_URL;
  const diretorio = argumento("dir") ?? "backups";
  const dia = argumento("dia");
  const limpar = process.argv.includes("--limpar");
  const confirmado = process.argv.includes("--confirmar");

  if (!url) {
    console.error("Informe --db ou defina DATABASE_URL.");
    process.exitCode = 1;
    return;
  }

  const parsed = new URL(url);
  if (!HOSTS_LOCAIS.has(parsed.hostname)) {
    console.error(
      `Recusado: ${parsed.hostname} não é host local. O drill de restauração nunca roda contra banco remoto.`,
    );
    process.exitCode = 1;
    return;
  }

  if (limpar && !confirmado) {
    console.error(
      "--limpar apaga as tabelas do destino. Repita com --confirmar.",
    );
    process.exitCode = 1;
    return;
  }

  const destino = destinoDiretorio(diretorio);
  const { manifesto, chave } = await carregarManifesto(destino, dia);
  console.log(
    `Manifesto: ${chave} (gerado em ${manifesto.geradoEm}, ${manifesto.totais.linhas} linhas)`,
  );

  const cliente = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

  try {
    const resultado = await restaurarBackup({
      cliente,
      manifesto,
      limparTabelas: limpar,
      lerArquivo: (arquivo) => destino.ler(arquivo),
      aoProgresso: (mensagem) => console.log(`  ${mensagem}`),
    });

    console.log(
      `\nRestauração concluída: ${resultado.porTabela.length} tabelas, ${resultado.chavesEstrangeirasRecriadas} FKs recriadas.`,
    );

    if (resultado.divergencias.length > 0) {
      console.error("\nDivergências de contagem:");
      for (const divergencia of resultado.divergencias) {
        console.error(`  - ${divergencia}`);
      }
      process.exitCode = 1;
    }
  } catch (erro) {
    console.error("Restauração falhou:", erro);
    process.exitCode = 1;
  } finally {
    await cliente.end({ timeout: 5 });
    await sqlBruto.end({ timeout: 5 });
  }
}

void principal();
