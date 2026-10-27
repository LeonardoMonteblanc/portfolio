// scripts/seed-admin.ts
import { hashSenha } from "@/infrastructure/auth/hash";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@diretorio.local";
  const nome = process.env.SEED_ADMIN_NOME || "Administrador";
  const senha = process.env.SEED_ADMIN_SENHA || "senha-temporaria-123";

  const senhaHash = await hashSenha(senha);

  await db
    .insert(administrador)
    .values({
      email,
      nome,
      senhaHash,
      ativo: true,
      tokenVersion: 0,
    })
    .onConflictDoNothing();

  console.log(`Admin criado/verificado: ${email}`);
}

seedAdmin().catch(console.error);
