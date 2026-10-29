// src/lib/auth.ts
import { cookies } from "next/headers";
import { validarJWT, obterAdminIdDoToken } from "@/infrastructure/auth/jwt";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";

export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value ?? null;
}

export async function getAdminId(): Promise<string | null> {
  const token = await getToken();
  if (!token) return null;
  return obterAdminIdDoToken(token);
}

export async function getAdmin(): Promise<{
  id: string;
  nome: string;
  email: string;
} | null> {
  const token = await getToken();
  if (!token) return null;

  const payload = await validarJWT(token);
  if (!payload) return null;

  const adminId = payload.adminId;

  const admin = await db.query.administrador.findFirst({
    where: eq(administrador.id, adminId),
    columns: {
      id: true,
      nome: true,
      email: true,
      ativo: true,
      tokenVersion: true,
    },
  });

  if (!admin || !admin.ativo || admin.tokenVersion !== payload.tv) return null;

  return { id: admin.id, nome: admin.nome, email: admin.email };
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getAdmin()) !== null;
}
