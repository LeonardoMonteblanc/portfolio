// src/application/auth/recuperar-senha.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";
import { hashSenha } from "@/infrastructure/auth/hash";
import { logRecuperacaoSenha } from "@/infrastructure/db/schema/logs";
import crypto from "crypto";
import { enviarEmailRecuperacaoSenha } from "@/infrastructure/email/client";
import {
  storePasswordResetToken,
  verifyPasswordResetToken,
} from "@/infrastructure/db/repositories/passwordResetTokenRepository";

const solicitarSchema = z.object({
  email: z.string().email(),
});

const redefinirSchema = z
  .object({
    token: z.string().min(1),
    senha: z.string().min(8),
    confirmarSenha: z.string().min(8),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

async function gerarTokenRecuperacao(): Promise<{
  token: string;
  hash: string;
}> {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export async function solicitarRecuperacaoSenhaAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = { email: formData.get("email") };
  const parseResult = solicitarSchema.safeParse(rawData);

  if (!parseResult.success) {
    return { error: "E-mail inválido." };
  }

  const { email } = parseResult.data;

  // Sempre retornar mensagem genérica para evitar enumeração
  const admin = await db.query.administrador.findFirst({
    where: eq(administrador.email, email.toLowerCase()),
  });

  if (admin && admin.ativo) {
    const { token } = await gerarTokenRecuperacao();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiracao = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await storePasswordResetToken({
      adminId: admin.id,
      token,
      expiresAt: expiracao,
    });
    // Por simplicidade, usamos tokenVersion como marker
    await db
      .update(administrador)
      .set({ tokenVersion: admin.tokenVersion + 1 })
      .where(eq(administrador.id, admin.id));

    await db.insert(logRecuperacaoSenha).values({
      atorTipo: "admin",
      adminId: admin.id,
      etapa: "solicitacao",
    });

    // Enviar e-mail (fire and forget, não bloqueia resposta)
    enviarEmailRecuperacaoSenha(email, token).catch(console.error);
  }

  // Log sempre (mesmo se admin não existe)
  await db.insert(logRecuperacaoSenha).values({
    atorTipo: admin ? "admin" : "sistema",
    adminId: admin?.id,
    etapa: "solicitacao",
  });

  return {
    success: true,
    message: "Se o e-mail existir, enviaremos instruções.",
  };
}

export async function redefinirSenhaAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    token: formData.get("token"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  };

  const parseResult = redefinirSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.flatten().fieldErrors;
    return {
      error: Object.values(errorMsg).flat().join(", ") || "Dados inválidos",
    };
  }

  const { token, senha } = parseResult.data;

  // Verify token against stored hash and expiry
  const verified = await verifyPasswordResetToken({ adminId: "", token });
  if (!verified) {
    return { error: "Token inválido ou expirado" };
  }
  const admin = await db.query.administrador.findFirst({
    where: eq(administrador.id, verified.adminId),
  });
  if (!admin) {
    return { error: "Administrador não encontrado" };
  }

  // Update password hash and increment tokenVersion to invalidate any other tokens
  const newHash = await hashSenha(senha);
  await db
    .update(administrador)
    .set({ senhaHash: newHash, tokenVersion: admin!.tokenVersion + 1 })
    .where(eq(administrador.id, admin!.id));

  // Log password reset success
  await db.insert(logRecuperacaoSenha).values({
    atorTipo: "admin",
    adminId: admin!.id,
    etapa: "reset_senha",
  });

  // Optionally, delete the used token (cleanup)
  // Implementation left as future improvement – could call a repository delete method

  return {
    success: true,
    message: "Senha redefinida com sucesso.",
    redirect: "/login",
  };
}
