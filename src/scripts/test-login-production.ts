// src/scripts/test-login.ts
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";
import { verificarSenha, hashSenha } from "@/infrastructure/auth/hash";
import { gerarJWT } from "@/infrastructure/auth/jwt";
import { cookies } from "next/headers";

async function testLogin() {
  const email = "admin@guiabg.com.br";
  const senha = "Guiabg@2024!";

  console.log("Testing login for:", email);

  // Test 1: Check if admin exists
  const admin = await db.query.administrador.findFirst({
    where: (a, { eq }) => eq(a.email, email.toLowerCase()),
  });

  if (!admin) {
    console.log("❌ Admin not found");
    return;
  }

  console.log("✅ Admin found:", admin.id, admin.email, admin.ativo);

  // Test 2: Verify password
  const senhaValida = await verificarSenha("Guiabg@2024!", admin.senhaHash);
  console.log("Password valid:", senhaValida);

  if (!senhaValida) {
    console.log("❌ Password verification failed");
    return;
  }

  console.log("✅ Password verified");

  // Test 3: Generate JWT
  try {
    const token = await gerarJWT(admin);
    console.log("✅ JWT generated:", token.substring(0, 20) + "...");

    // Test 4: Validate JWT
    const { validarJWT } = await import("@/infrastructure/auth/jwt");
    const payload = await validarJWT(token);
    console.log("✅ JWT validated:", payload);
  } catch (e) {
    console.error("❌ JWT error:", e);
  }
}

testLogin()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
