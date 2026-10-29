// src/app/api/auth/me/route.ts
import { cookies } from "next/headers";
import { validarJWTNode } from "@/infrastructure/auth/jwt-node";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value ?? null;

  const secretHash = createHash("sha256")
    .update(token || "")
    .digest("hex")
    .slice(0, 16);

  if (!token) {
    return NextResponse.json(
      { error: "No token", step: "cookie", secretHash },
      { status: 401 },
    );
  }

  // Test validarJWTNode
  const payload = validarJWTNode(token);

  if (!payload) {
    return NextResponse.json(
      {
        error: "JWT verify failed",
        step: "jwtVerify",
        secretHash,
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
