// src/infrastructure/auth/jwt.ts
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/shared/env";
import { Administrador } from "@/domain/entities/administrador";

export const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
export const JWT_ISSUER = "diretorio-comunitario";
export const JWT_AUDIENCE = "painel-admin";

export interface JWTPayload {
  adminId: string;
  tv: number;
  iat: number;
  exp: number;
}

export async function gerarJWT(admin: Administrador): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  const expiracao = agora + 7 * 24 * 60 * 60; // 7 dias

  return new SignJWT({ adminId: admin.id, tv: admin.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(agora)
    .setExpirationTime(expiracao)
    .sign(JWT_SECRET);
}

export async function validarJWT(
  token: string,
): Promise<{ adminId: string; tv: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (typeof payload.adminId !== "string" || typeof payload.tv !== "number") {
      return null;
    }

    return { adminId: payload.adminId, tv: payload.tv };
  } catch {
    return null;
  }
}

export async function obterAdminIdDoToken(
  token: string,
): Promise<string | null> {
  const payload = await validarJWT(token);
  return payload?.adminId ?? null;
}
