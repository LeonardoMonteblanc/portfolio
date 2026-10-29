// src/scripts/update-admin-token-version.ts
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";

async function updateAdminTokenVersion() {
  const email = "admin@guiabg.com.br";

  const existing = await db.query.administrador.findFirst({
    where: (a, { eq }) => eq(a.email, email),
  });

  if (!existing) {
    console.log("Admin not found:", email);
    return;
  }

  console.log("Current admin:", {
    id: existing.id,
    email: existing.email,
    nome: existing.nome,
    ativo: existing.ativo,
    tokenVersion: existing.tokenVersion,
  });

  if (existing.tokenVersion !== 1) {
    await db
      .update(administrador)
      .set({ tokenVersion: 1 })
      .where(eq(administrador.id, existing.id));

    console.log("✅ Updated tokenVersion to 1");
  } else {
    console.log("✅ tokenVersion is already 1");
  }

  if (!existing.ativo) {
    await db
      .update(administrador)
      .set({ ativo: true })
      .where(eq(administrador.id, existing.id));

    console.log("✅ Updated ativo to true");
  } else {
    console.log("✅ ativo is already true");
  }
}

updateAdminTokenVersion()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
