// src/scripts/seed-admin.ts
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { hashSenha } from "@/infrastructure/auth/hash";

async function seedAdmin() {
  const email = "admin@diretorio.local";
  const senha = "admin123456"; // Change in production!
  const nome = "Administrador";

  const senhaHash = await hashSenha(senha);

  const existing = await db.query.administrador.findFirst({
    where: (a, { eq }) => eq(a.email, email),
  });

  if (existing) {
    console.log("Admin already exists:", existing.email);
    return;
  }

  await db.insert(administrador).values({
    email,
    senhaHash,
    nome,
    ativo: true,
    tokenVersion: 1,
  });

  console.log("Admin created:", email, "/ password:", senha);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
