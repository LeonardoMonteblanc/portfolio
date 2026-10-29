// src/scripts/test-login-action.ts
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { verificarSenha, hashSenha } from "@/infrastructure/auth/hash";
import { gerarJWT } from "@/infrastructure/auth/jwt";
import { rateLimitLogin } from "@/infrastructure/auth/rate-limit";
import { cookies } from "next/headers";
import { logLogin, logFalhaLogin } from "@/infrastructure/db/schema/logs";

async function testLoginAction() {
  const email = "admin@guiabg.com.br";
  const senha = "Guiabg@2024!";
  const ip = "127.0.0.1";

  console.log("Testing login action for:", email);

  // Test rate limiter
  console.log("Testing rate limiter...");
  const rlResult = await rateLimitLogin.limit(ip);
  console.log("Rate limit result:", rlResult);

  // Test admin lookup
  const admin = await db.query.administrador.findFirst({
    where: (a, { eq }) => eq(a.email, email.toLowerCase()),
  });

  if (!admin) {
    console.log("❌ Admin not found");
    return;
  }

  console.log("✅ Admin found:", admin.id, admin.email, admin.ativo);

  // Test password verification
  const senhaValida = await verificarSenha("Guiabg@2024!", admin.senhaHash);
  console.log("Password valid:", senhaValida);

  if (!senhaValida) {
    console.log("❌ Password verification failed");
    return;
  }

  console.log("✅ Password verified");

  // Test JWT generation
  try {
    const token = await gerarJWT(admin);
    console.log("✅ JWT generated:", token.substring(0, 20) + "...");

    // Test cookie setting
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    console.log("✅ Cookie set successfully");

    // Test JWT validation
    const { validarJWT } = await import("@/infrastructure/auth/jwt");
    const payload = await validarJWT(token);
    console.log("✅ JWT validated:", payload);

    // Test log insertion
    await db.insert(logLogin).values({
      atorTipo: "admin",
      adminId: admin.id,
      ipOrigem: ip,
    });
    console.log("✅ Log inserted");
  } catch (e) {
    console.error("❌ Error:", e);
  }
}

testLoginAction()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
