// src/application/auth/login.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { administrador } from "@/infrastructure/db/schema/administrador";
import { eq } from "drizzle-orm";
import { hashSenha, verificarSenha } from "@/infrastructure/auth/hash";
import { gerarJWT } from "@/infrastructure/auth/jwt";
import { rateLimitLogin } from "@/infrastructure/auth/rate-limit";
import {
  logLogin,
  logFalhaLogin,
  logLogout,
} from "@/infrastructure/db/schema/logs";
import { ErroDominio } from "@/domain/errors";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function loginAction(prevState: unknown, formData: FormData) {
  // Rate limit
  const ip = "unknown"; // IP will be handled by API route
  const { success } = await rateLimitLogin.limit(ip);
  if (!success) {
    return { error: "Muitas tentativas. Tente novamente em 1 minuto." };
  }

  // Validar entrada
  const rawData = {
    email: formData.get("email"),
    senha: formData.get("senha"),
  };

  const parseResult = loginSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { error: "E-mail e senha são obrigatórios." };
  }

  const { email, senha } = parseResult.data;

  // Buscar admin
  const admin = await db.query.administrador.findFirst({
    where: eq(administrador.email, email.toLowerCase()),
  });

  if (!admin) {
    // Log falha - mesmo tempo de resposta para evitar enumeração
    await db.insert(logFalhaLogin).values({
      atorTipo: "admin",
      emailTentado: email,
      motivo: "admin_nao_encontrado",
      ipOrigem: "unknown",
    });

    return { error: "E-mail ou senha incorretos." };
  }

  if (!admin.ativo) {
    await db.insert(logFalhaLogin).values({
      atorTipo: "admin",
      emailTentado: email,
      motivo: "admin_inativo",
      ipOrigem: "unknown",
    });

    return { error: "E-mail ou senha incorretos." };
  }

  // Verificar senha
  const senhaValida = await verificarSenha(senha, admin.senhaHash);
  if (!senhaValida) {
    await db.insert(logFalhaLogin).values({
      atorTipo: "admin",
      adminId: admin.id,
      emailTentado: email,
      motivo: "senha_invalida",
      ipOrigem: "unknown",
    });

    return { error: "E-mail ou senha incorretos." };
  }

  // Gerar JWT
  const token = await gerarJWT(admin);

  // Log sucesso
  await db.insert(logLogin).values({
    atorTipo: "admin",
    adminId: admin.id,
    ipOrigem: "unknown",
  });

  return { success: true, redirect: "/admin", token };
}

export async function logoutAction() {
  // Cookie deletion will be handled by API route
  return { success: true, redirect: "/login", deleteCookie: true };
}
