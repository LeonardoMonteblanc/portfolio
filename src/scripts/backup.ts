// src/scripts/backup.ts
import { executarBackup } from "@/application/backup/backup.service";
import { sqlBruto } from "@/infrastructure/db/client";
import {
  destinoDiretorio,
  destinoR2,
  ErroDestinoBackup,
} from "@/infrastructure/backup/destino";

/**
 * Backup sob demanda, fora da Vercel.
 *
 * Uso:
 *   pnpm db:backup                        # grava em ./backups (padrão)
 *   pnpm db:backup --dir D:\backups       # outro diretório
 *   pnpm db:backup --r2                   # envia ao bucket privado do R2
 *   pnpm db:backup --retencao 90          # sobrescreve a retenção da configuracao
 *
 * Serve para duas coisas: rodar o backup agora (sem esperar o cron) e produzir
 * o arquivo do drill de restauração (RNF-027).
 */

function argumento(nome: string): string | undefined {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function principal(): Promise<void> {
  const usarR2 = process.argv.includes("--r2");
  const diretorio = argumento("dir") ?? "backups";
  const retencao = argumento("retencao");

  try {
    const destino = usarR2 ? destinoR2() : destinoDiretorio(diretorio);
    const resultado = await executarBackup({
      destino,
      retencaoDias: retencao ? Number(retencao) : undefined,
      aoProgresso: (mensagem) => console.log(`  ${mensagem}`),
    });

    console.log(
      `\nBackup ${resultado.data} concluído em ${resultado.destino}\n` +
        `  tabelas: ${resultado.tabelas}\n` +
        `  linhas:  ${resultado.linhas}\n` +
        `  bytes:   ${resultado.bytes}\n` +
        `  expirados removidos: ${resultado.removidos.length}\n`,
    );
  } catch (erro) {
    if (erro instanceof ErroDestinoBackup) {
      console.error(`Destino inválido: ${erro.message}`);
    } else {
      console.error("Backup falhou:", erro);
    }
    process.exitCode = 1;
  } finally {
    // Sem isso o pool do postgres-js mantém o processo vivo depois do trabalho.
    await sqlBruto.end({ timeout: 5 });
  }
}

void principal();
