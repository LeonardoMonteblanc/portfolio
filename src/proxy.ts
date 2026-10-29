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

    // NOTA: A verificação de admin ativo e tokenVersion foi movida para os
    // Server Components das páginas de admin (ex: /admin/solicitacoes/page.tsx)
    // para evitar problemas de conexão com banco no middleware/edge runtime.
    // O middleware aqui apenas valida a assinatura e expiração do JWT.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
