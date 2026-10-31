// src/application/backup/tipos.ts
/**
 * Formato do backup lógico (F9-11 / RF-068).
 *
 * NDJSON + gzip por tabela em vez de `pg_dump`: o `pg_dump` não existe no
 * runtime da Vercel, e um formato legível torna o drill de restauração
 * (RNF-027) verificável sem instalar a mesma versão do Postgres.
 * `versao` existe para que uma mudança de formato não seja lida errado por um
 * script antigo — restaurador recusa versão que não conhece.
 */

export const VERSAO_FORMATO_BACKUP = 1;

export interface TabelaBackup {
  nome: string;
  linhas: number;
  bytes: number;
  sha256: string;
  arquivo: string;
}

export interface ManifestoBackup {
  versao: number;
  geradoEm: string;
  /** Data do backup (AAAA-MM-DD), usada na chave e na retenção. */
  data: string;
  servidor: { host: string; banco: string };
  migracoesAplicadas: number | null;
  tabelas: TabelaBackup[];
  totais: { tabelas: number; linhas: number; bytes: number };
}

export interface ResultadoBackup {
  data: string;
  destino: string;
  tabelas: number;
  linhas: number;
  bytes: number;
  manifesto: ManifestoBackup;
  /** Chaves apagadas pela retenção. */
  removidos: string[];
  duracaoMs: number;
}

/** `backups/AAAA-MM-DD` — usado tanto na escrita quanto na retenção. */
export function prefixoDoDia(data: string): string {
  return `backups/${data}/`;
}
