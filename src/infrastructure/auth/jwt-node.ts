// src/infrastructure/auth/jwt-node.ts
// Node.js only - use in API routes only (not in Server Components)
import jwt from "jsonwebtoken";
import { env } from "@/shared/env";
import { Administrador } from "@/domain/entities/administrador";

const JWT_SECRET = env.JWT_SECRET;
const JWT_ISSUER = "diretorio-comunitario";
const JWT_AUDIENCE = "painel-admin";

export interface JWTPayload {
  adminId: string;
  tv: number;
  iat: number;
  exp: number;
}

export function gerarJWTNode(admin: Administrador): string {
  return jwt.sign({ adminId: admin.id, tv: admin.tokenVersion }, JWT_SECRET, {
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: "7d",
  });
}

export function validarJWTNode(
  token: string,
): { adminId: string; tv: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;

    if (typeof payload.adminId !== "string" || typeof payload.tv !== "number") {
      return null;
    }

    return { adminId: payload.adminId, tv: payload.tv };
  } catch {
    return null;
  }
}

export function obterAdminIdDoTokenNode(token: string): string | null {
  const payload = validarJWTNode(token);
  return payload?.adminId ?? null;
}
