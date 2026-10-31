// src/app/api/webhooks/resend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { logComunicacao } from "@/infrastructure/db/schema/logs";
import {
  interpretarEventoResend,
  verificarAssinaturaWebhook,
  type EventoResend,
} from "@/infrastructure/email/webhook";

/**
 * F9-10 — webhook de eventos do Resend (entrega, bounce, reclamação).
 *
 * Grava cada evento em `log_comunicacao` para que a operação saiba o que
 * realmente chegou ao destinatário. A assinatura Svix é verificada antes de
 * qualquer escrita; sem `RESEND_WEBHOOK_SECRET` a rota responde 503 (falha
 * fechada, nunca aceita evento não autenticado).
 */
export async function POST(request: NextRequest) {
  const segredo = process.env.RESEND_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("[Webhook Resend] RESEND_WEBHOOK_SECRET não configurado");
    return NextResponse.json(
      { error: "Webhook não configurado" },
      { status: 503 },
    );
  }

  const corpo = await request.text();
  const verificacao = verificarAssinaturaWebhook({
    segredo,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    assinatura: request.headers.get("svix-signature"),
    corpo,
  });

  if (!verificacao.valido) {
    console.warn("[Webhook Resend] Assinatura rejeitada:", verificacao.motivo);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let evento: EventoResend;
  try {
    evento = JSON.parse(corpo) as EventoResend;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof evento.type !== "string") {
    return NextResponse.json({ error: "Evento sem tipo" }, { status: 400 });
  }

  const registro = interpretarEventoResend(evento);

  // Evento de entrega não tem destinatário em alguns casos: mantém a trilha
  // mesmo assim, com o email_id no campo de erro/detalhe.
  await db.insert(logComunicacao).values({
    atorTipo: "sistema",
    tipo: registro.tipo,
    destinatario:
      registro.destinatario || (evento.data?.email_id ?? "desconhecido"),
    sucesso: registro.sucesso,
    erro: registro.erro,
  });

  return NextResponse.json({ received: true });
}
