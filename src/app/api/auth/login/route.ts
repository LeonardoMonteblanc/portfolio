// src/app/api/auth/login/route.ts
import { loginAction } from "@/application/auth/login";
import { NextRequest, NextResponse } from "next/server";
import { JWT_SECRET } from "@/infrastructure/auth/jwt";
import { createHash } from "crypto";
import { jwtVerify } from "jose";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let email: string;
  let senha: string;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    email = body.email;
    senha = body.senha;
  } else {
    const formData = await request.formData();
    email = formData.get("email") as string;
    senha = formData.get("senha") as string;
  }

  const formData = new FormData();
  formData.append("email", email || "");
  formData.append("senha", senha || "");

  const result = await loginAction(null, formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const secretHash = createHash("sha256")
    .update(Buffer.from(JWT_SECRET))
    .digest("hex")
    .slice(0, 16);

  // Auto-teste: verificar o token gerado
  let selfVerify: any;
  if (result.token) {
    try {
      const verified = await jwtVerify(result.token, JWT_SECRET, {
        issuer: "diretorio-comunitario",
        audience: "painel-admin",
      });
      selfVerify = { success: true, payload: verified.payload };
    } catch (e: any) {
      selfVerify = { success: false, error: e.message, code: e.code };
    }
  }

  const response = NextResponse.json({
    success: true,
    redirect: result.redirect,
    secretHash,
    token: result.token,
    selfVerify,
  });

  // Set auth cookie
  if (result.token) {
    response.cookies.set("auth_token", result.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });
  }

  return response;
}
