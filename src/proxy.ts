// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validarJWT } from "@/infrastructure/auth/jwt";

const ROTAS_PUBLICAS = ["/login", "/recuperar-senha", "/api/webhooks"];
const ROTAS_ADMIN = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rotas públicas
  if (ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota))) {
    return NextResponse.next();
  }

  // Verificar se é rota admin
  const isAdminRoute = ROTAS_ADMIN.some((rota) => pathname.startsWith(rota));

  if (isAdminRoute) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await validarJWT(token);

    if (!payload) {
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

    const admin = await db.query.administrador.findFirst({
      where: eq(administrador.id, payload.adminId),
      columns: { ativo: true, tokenVersion: true },
    });

    if (!admin || !admin.ativo || admin.tokenVersion !== payload.tv) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/recuperar-senha"],
};
