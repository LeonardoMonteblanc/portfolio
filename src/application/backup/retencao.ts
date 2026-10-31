// src/application/backup/retencao.ts
import type { DestinoBackup } from "@/infrastructure/backup/destino";

/**
 * Retenção do backup (RF-068).
 *
 * Separado de `backup.service` de propósito: esta regra é pura (só lista e
 * apaga chaves) e por isso dá para testá-la sem banco. O dia sai do próprio
 * caminho (`backups/AAAA-MM-DD/`), então um arquivo solto no bucket nunca é
 * apagado por engano.
 */
export async function aplicarRetencao(
  destino: DestinoBackup,
  retencaoDias: number,
  agora: Date,
): Promise<string[]> {
  if (retencaoDias <= 0) return [];

  const limite = new Date(agora);
  limite.setUTCDate(limite.getUTCDate() - retencaoDias);
  const limiteDia = limite.toISOString().slice(0, 10);

  const chaves = await destino.listar("backups/");
  const expiradas = chaves.filter((chave) => {
    const dia = /^backups\/(\d{4}-\d{2}-\d{2})\//.exec(chave)?.[1];
    return Boolean(dia) && dia! < limiteDia;
  });

  if (expiradas.length > 0) {
    await destino.remover(expiradas);
  }

  return expiradas;
}
