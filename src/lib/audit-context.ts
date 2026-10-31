// src/lib/audit-context.ts
import { headers } from "next/headers";
import { getAdmin } from "@/lib/auth";
import { ErroDominio } from "@/domain/errors/domain-error";
import type { AtorTipo } from "@/domain/enums";

/**
 * Contexto de auditoria de uma server action.
 *
 * Além de alimentar o `log_auditoria`, esta função é a **guarda de
 * autorização** das actions administrativas: sem sessão válida ela lança
 * `NAO_AUTENTICADO`. Isso fecha a lacuna de actions que confiavam apenas no
 * layout `/admin` (um POST direto não passa pelo layout).
 */
export interface ContextoAuditoria {
  atorTipo: AtorTipo;
  atorId: string | null;
  ipOrigem?: string;
  userAgent?: string;
}

function ipDaRequisicao(headersReq: Headers): string | undefined {
  const encaminhado = headersReq.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]?.trim() || undefined;
  return headersReq.get("x-real-ip") ?? undefined;
}

/** Exige sessão de admin e devolve o contexto pronto para `appendLog`. */
export async function exigirContextoAdmin(): Promise<ContextoAuditoria> {
  const admin = await getAdmin();
  if (!admin?.id) {
    throw new ErroDominio(
      "NAO_AUTENTICADO",
      "Sessão expirada. Faça login novamente.",
    );
  }

  const cabecalhos = await headers();

  return {
    atorTipo: "admin",
    atorId: admin.id,
    ipOrigem: ipDaRequisicao(cabecalhos),
    userAgent: cabecalhos.get("user-agent") ?? undefined,
  };
}

/** Contexto para eventos sem sessão (falha de login, rotinas do sistema). */
export async function contextoDaRequisicao(
  atorTipo: AtorTipo = "sistema",
  atorId: string | null = null,
): Promise<ContextoAuditoria> {
  const cabecalhos = await headers();
  return {
    atorTipo,
    atorId,
    ipOrigem: ipDaRequisicao(cabecalhos),
    userAgent: cabecalhos.get("user-agent") ?? undefined,
  };
}
