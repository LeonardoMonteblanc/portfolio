// src/lib/api-guard.ts
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";

/**
 * Guard para rotas internas de diagnóstico/API: exige sessão de admin ativa.
 * Retorna a resposta de erro quando não autenticado, ou null quando liberado.
 */
export async function exigirAdmin(): Promise<NextResponse | null> {
  const admin = await getAdmin();
  if (!admin?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return null;
}

/**
 * Payload de erro padronizado. O stack trace só aparece em desenvolvimento,
 * para não vazar estrutura interna em produção.
 */
export function erroInterno(error: unknown): Record<string, unknown> {
  const mensagem = error instanceof Error ? error.message : "Erro interno";
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return { success: false, error: mensagem, stack: error.stack };
  }
  return { success: false, error: mensagem };
}
