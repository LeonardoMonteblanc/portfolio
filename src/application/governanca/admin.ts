// src/application/governanca/admin.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema";
import { logSuspensaoAdmin } from "@/infrastructure/db/schema/logs";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";
import { appendLog } from "@/infrastructure/audit/audit.service";
import { contextoDaRequisicao } from "@/lib/audit-context";

const suspenderAdminSchema = z.object({
  adminId: z.string().uuid(),
  motivo: z.string().min(5).max(500),
  ate: z.string().datetime().optional(), // ISO string, opcional para suspensão indefinida
});

export async function suspenderAdminAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  // Admin não pode suspender a si mesmo
  const rawData = {
    adminId: formData.get("adminId"),
    motivo: formData.get("motivo"),
    ate: formData.get("ate") || undefined,
  };

  const parseResult = suspenderAdminSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { adminId, motivo, ate } = parseResult.data;

  if (adminId === admin.id) {
    return { error: "Não é possível suspender a si mesmo" };
  }

  const adminAlvo = await db.query.administrador.findFirst({
    where: (a, { eq }) => eq(a.id, adminId),
  });

  if (!adminAlvo) {
    return { error: "Admin não encontrado" };
  }

  if (!adminAlvo.ativo) {
    return { error: "Admin já está suspenso" };
  }

  await db.transaction(async (tx) => {
    // Suspender admin
    await tx
      .update(administrador)
      .set({ ativo: false })
      .where(eq(administrador.id, adminId));

    // Log de suspensão
    await tx.insert(logSuspensaoAdmin).values({
      atorTipo: "admin",
      atorId: admin.id,
      adminAlvoId: adminId,
      acao: "suspender",
      motivo,
      ate: ate ? new Date(ate) : null,
    });

    await appendLog(
      {
        ...(await contextoDaRequisicao("admin", admin.id)),
        acao: "suspender_admin",
        entidadeTipo: "administrador",
        entidadeId: adminId,
        detalhes: { motivo, ate: ate ?? null },
        snapshotAntes: { ativo: true },
        snapshotDepois: { ativo: false },
      },
      tx,
    );
  });

  revalidatePath("/admin");

  return { success: true };
}

const reativarAdminSchema = z.object({
  adminId: z.string().uuid(),
  motivo: z.string().min(5).max(500),
});

export async function reativarAdminAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const rawData = {
    adminId: formData.get("adminId"),
    motivo: formData.get("motivo"),
  };

  const parseResult = reativarAdminSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { adminId, motivo } = parseResult.data;

  const adminAlvo = await db.query.administrador.findFirst({
    where: (a, { eq }) => eq(a.id, adminId),
  });

  if (!adminAlvo) {
    return { error: "Admin não encontrado" };
  }

  if (adminAlvo.ativo) {
    return { error: "Admin já está ativo" };
  }

  await db.transaction(async (tx) => {
    // Reativar admin
    await tx
      .update(administrador)
      .set({ ativo: true })
      .where(eq(administrador.id, adminId));

    // Log de reativação
    await tx.insert(logSuspensaoAdmin).values({
      atorTipo: "admin",
      atorId: admin.id,
      adminAlvoId: adminId,
      acao: "reativar",
      motivo,
    });

    await appendLog(
      {
        ...(await contextoDaRequisicao("admin", admin.id)),
        acao: "reativar_admin",
        entidadeTipo: "administrador",
        entidadeId: adminId,
        detalhes: { motivo },
        snapshotAntes: { ativo: false },
        snapshotDepois: { ativo: true },
      },
      tx,
    );
  });

  revalidatePath("/admin");

  return { success: true };
}

const listarAdminsSchema = z.object({});

export async function listarAdminsAction(
  prevState: unknown,
  formData: FormData,
) {
  const admin = await getAdmin();
  if (!admin) return { error: "Não autorizado" };

  const admins = await db.query.administrador.findMany({
    orderBy: (a, { asc }) => [asc(a.nome)],
  });

  return { success: true, admins };
}
