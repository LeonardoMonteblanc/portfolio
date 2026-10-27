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
  const adminId = await getAdminId();
  if (!adminId) return null;

  const admin = await db.query.administrador.findFirst({
    where: eq(administrador.id, adminId),
    columns: { id: true, nome: true, email: true, ativo: true },
  });

  if (!admin || !admin.ativo) return null;

  return { id: admin.id, nome: admin.nome, email: admin.email };
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getAdmin()) !== null;
}
