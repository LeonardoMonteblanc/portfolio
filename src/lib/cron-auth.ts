// src/lib/cron-auth.ts
import type { NextRequest } from "next/server";

/**
 * Autoriza chamadas do Vercel Cron (que envia `Authorization: Bearer $CRON_SECRET`).
 *
 * Sem `CRON_SECRET` configurado a função sempre devolve `false`: um deploy sem
 * a variável nunca libera rotas de cron.
 */
export function autorizadoPorCron(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}
