// src/app/api/auth/me/route.ts
import { cookies } from "next/headers";
import {
  validarJWT,
  JWT_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
} from "@/infrastructure/auth/jwt";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createHash } from "crypto";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value ?? null;

  // Hash do segredo para diagnóstico (não expõe o segredo)
  const secretHash = createHash("sha256")
    .update(Buffer.from(JWT_SECRET))
    .digest("hex")
    .slice(0, 16);

  if (!token) {
    return NextResponse.json(
      { error: "No token", step: "cookie", secretHash },
      { status: 401 },
    );
  }

  // Test jwtVerify directly with detailed error
  let payload: any;
  try {
    const result = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    payload = result.payload;
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "JWT verify failed",
        step: "jwtVerify",
        message: e.message,
        code: e.code,
        secretHash,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      },
      { status: 401 },
    );
  }

  if (typeof payload.adminId !== "string" || typeof payload.tv !== "number") {
    return NextResponse.json(
      { error: "Invalid payload types", step: "payload", payload, secretHash },
      { status: 401 },
    );
  }

  const admin = await db.query.administrador.findFirst({
    where: eq(administrador.id, payload.adminId),
    columns: {
      id: true,
      nome: true,
      email: true,
      ativo: true,
      tokenVersion: true,
    },
  });

  if (!admin) {
    return NextResponse.json(
      {
        error: "Admin not found",
        step: "db",
        adminId: payload.adminId,
        secretHash,
      },
      { status: 401 },
    );
  }

  if (!admin.ativo) {
    return NextResponse.json(
      { error: "Admin inactive", step: "active", admin, secretHash },
      { status: 401 },
    );
  }

  if (admin.tokenVersion !== payload.tv) {
    return NextResponse.json(
      {
        error: "Token version mismatch",
        step: "tokenVersion",
        dbTokenVersion: admin.tokenVersion,
        jwtTokenVersion: payload.tv,
        secretHash,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    admin: { id: admin.id, nome: admin.nome, email: admin.email },
    payload,
    secretHash,
  });
}
