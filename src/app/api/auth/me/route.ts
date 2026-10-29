// src/app/api/auth/me/route.ts
import { cookies } from "next/headers";
import { validarJWT } from "@/infrastructure/auth/jwt";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value ?? null;

  if (!token) {
    return NextResponse.json(
      { error: "No token", step: "cookie" },
      { status: 401 },
    );
  }

  const payload = await validarJWT(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid JWT", step: "jwt" },
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
      { error: "Admin not found", step: "db", adminId: payload.adminId },
      { status: 401 },
    );
  }

  if (!admin.ativo) {
    return NextResponse.json(
      { error: "Admin inactive", step: "active", admin },
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
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    admin: { id: admin.id, nome: admin.nome, email: admin.email },
    payload,
  });
}
