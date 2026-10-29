// src/scripts/seed-admin-production.ts
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { hashSenha } from "@/infrastructure/auth/hash";

async function seedAdminProduction() {
  const email = "admin@guiabg.com.br";
  const senha = "Guiabg@2024!"; // Change this after first login!
  const nome = "Administrador GuiaBG";

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

  console.log("✅ Admin created successfully!");
  console.log("Email:", email);
  console.log("Senha:", senha);
  console.log("⚠️  IMPORTANT: Change password after first login!");
}

seedAdminProduction()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
