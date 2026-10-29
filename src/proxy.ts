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
  matcher: ["/admin/:path*"],
};
