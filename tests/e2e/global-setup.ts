import postgres from "postgres";

/**
 * Trava de ambiente do E2E.
 *
 * Além de recusar host remoto, confere que existe negócio publicado: teste E2E
 * contra banco vazio passaria verde sem provar nada.
 */
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

export default async function globalSetup(): Promise<void> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Defina DATABASE_URL para o banco local de E2E antes de rodar:\n" +
        "  $env:DATABASE_URL='postgresql://dev:dev@localhost:5432/diretorio_e2e'\n" +
        "  pnpm db:migrate; pnpm db:seed:completo",
    );
  }

  const parsed = new URL(url);
  if (!HOSTS_LOCAIS.has(parsed.hostname)) {
    throw new Error(
      `E2E recusado: DATABASE_URL aponta para "${parsed.hostname}".` +
        " Os testes criam e alteram dados; só rodam em Postgres local.",
    );
  }

  const cliente = postgres(url, { prepare: false, max: 1 });
  try {
    const linhas = await cliente.unsafe<Array<{ total: number }>>(
      "select count(*)::int as total from negocio where situacao_publicacao = 'publicado'",
    );
    const publicados = linhas[0]?.total ?? 0;
    if (publicados === 0) {
      throw new Error(
        "Nenhum negócio publicado no banco de E2E. Rode 'pnpm db:seed:completo' antes dos testes.",
      );
    }
  } finally {
    await cliente.end({ timeout: 5 });
  }
}
