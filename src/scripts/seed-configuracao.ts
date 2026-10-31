/**
 * Seed dos parâmetros operacionais (F9-01).
 *
 * Uso: pnpm db:seed:config
 * Idempotente: só cria as chaves que ainda não existem.
 */
import { asc } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema";
import {
  CHAVES_CONFIGURACAO,
  garantirConfiguracoesPadrao,
} from "@/application/configuracao/configuracao.service";

async function main() {
  const admins = await db
    .select({ id: administrador.id, email: administrador.email })
    .from(administrador)
    .orderBy(asc(administrador.criadoEm))
    .limit(1);

  const admin = admins[0];
  if (!admin) {
    throw new Error(
      "Nenhum administrador encontrado. Rode 'pnpm db:seed:admin' antes do seed de configuração.",
    );
  }

  const { criadas } = await garantirConfiguracoesPadrao(admin.id);

  console.log(
    criadas.length === 0
      ? `Nada a fazer: as ${CHAVES_CONFIGURACAO.length} chaves já existem.`
      : `Criadas ${criadas.length} chave(s): ${criadas.join(", ")}`,
  );
  console.log(`Responsável: ${admin.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("Falha no seed de configuração:", erro);
    process.exit(1);
  });
