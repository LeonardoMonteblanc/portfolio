// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validarJWT } from "@/infrastructure/auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se é rota admin
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    const token = request.cookies.get("auth_token")?.value;

    console.log("[PROXY] Token present:", !!token);
    console.log("[PROXY] Pathname:", pathname);

    if (!token) {
      console.log("[PROXY] No token, redirecting to login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await validarJWT(token);

    console.log("[PROXY] JWT payload:", payload);

    if (!payload) {
      console.log("[PROXY] JWT validation failed, redirecting to login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth_token");
      return response;
    }

    // Verificar se admin ainda está ativo e token_version confere
    const { db } = await import("@/infrastructure/db/client");
    const { administrador } =
      await import("@/infrastructure/db/schema/administrador");
    const { eq } = await import("drizzle-orm");

    console.log("[PROXY] Querying admin with ID:", payload.adminId);

    const admin = await db.query.administrador.findFirst({
      where: eq(administrador.id, payload.adminId),
      columns: { ativo: true, tokenVersion: true },
    });

    console.log("[PROXY] Admin found:", admin);
    console.log("[PROXY] Admin ativo:", admin?.ativo);
    console.log("[PROXY] Admin tokenVersion:", admin?.tokenVersion);
    console.log("[PROXY] Payload tv:", payload.tv);
    console.log(
      "[PROXY] tokenVersion !== payload.tv:",
      admin?.tokenVersion !== payload.tv,
    );

    if (!admin || !admin.ativo || admin.tokenVersion !== payload.tv) {
      console.log("[PROXY] Admin check failed, redirecting to login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth_token");
      return response;
    }

    console.log("[PROXY] Admin check passed, allowing request");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
