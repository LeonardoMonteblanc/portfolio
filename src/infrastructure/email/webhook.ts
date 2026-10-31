// src/infrastructure/email/webhook.ts
import crypto from "node:crypto";

/**
 * Verificação de assinatura de webhook do Resend (esquema Svix).
 *
 * O Resend assina `${svix-id}.${svix-timestamp}.${corpo}` com HMAC-SHA256 usando
 * o segredo do endpoint (formato `whsec_<base64>`). Sem essa verificação
 * qualquer pessoa poderia injetar eventos de entrega falsos na auditoria.
 *
 * Regras:
 * - comparação em tempo constante (`timingSafeEqual`);
 * - janela de tolerância para evitar replay de evento antigo;
 * - falha fechada: sem segredo configurado, nada é aceito.
 */

export interface EntradaVerificacaoWebhook {
  segredo: string;
  id: string | null;
  timestamp: string | null;
  assinatura: string | null;
  corpo: string;
  toleranciaSegundos?: number;
  agoraSegundos?: number;
}

export interface ResultadoVerificacaoWebhook {
  valido: boolean;
  motivo?:
    | "segredo_ausente"
    | "cabecalhos_ausentes"
    | "assinatura_invalida"
    | "timestamp_fora_da_janela";
}

const TOLERANCIA_PADRAO = 300;

function chaveDoSegredo(segredo: string): Buffer {
  const semPrefixo = segredo.startsWith("whsec_") ? segredo.slice(6) : segredo;
  return Buffer.from(semPrefixo, "base64");
}

export function verificarAssinaturaWebhook(
  entrada: EntradaVerificacaoWebhook,
): ResultadoVerificacaoWebhook {
  const { segredo, id, timestamp, assinatura, corpo } = entrada;

  if (!segredo) return { valido: false, motivo: "segredo_ausente" };
  if (!id || !timestamp || !assinatura) {
    return { valido: false, motivo: "cabecalhos_ausentes" };
  }

  const agora = entrada.agoraSegundos ?? Math.floor(Date.now() / 1000);
  const enviadoEm = Number(timestamp);
  const tolerancia = entrada.toleranciaSegundos ?? TOLERANCIA_PADRAO;

  if (!Number.isFinite(enviadoEm) || Math.abs(agora - enviadoEm) > tolerancia) {
    return { valido: false, motivo: "timestamp_fora_da_janela" };
  }

  const esperado = crypto
    .createHmac("sha256", chaveDoSegredo(segredo))
    .update(`${id}.${timestamp}.${corpo}`)
    .digest();

  // O header pode trazer várias assinaturas separadas por espaço: "v1,<b64> v1a,<b64>"
  const candidatas = assinatura
    .split(" ")
    .map((parte) => parte.split(",").pop() ?? "")
    .filter(Boolean);

  for (const candidata of candidatas) {
    const recebida = Buffer.from(candidata, "base64");
    if (recebida.length !== esperado.length) continue;
    if (crypto.timingSafeEqual(recebida, esperado)) return { valido: true };
  }

  return { valido: false, motivo: "assinatura_invalida" };
}

export interface EventoResend {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    created_at?: string;
    bounce?: { message?: string };
  };
}

/** Traduz o evento do Resend para o resultado registrado em log_comunicacao. */
export function interpretarEventoResend(evento: EventoResend): {
  tipo: string;
  destinatario: string;
  sucesso: boolean;
  erro: string | null;
} {
  const falhas = new Set(["email.bounced", "email.complained", "email.failed"]);

  const destinatario = evento.data?.to?.[0] ?? "";
  const sucesso = !falhas.has(evento.type);

  return {
    tipo: `webhook_${evento.type.replace(/\./g, "_")}`,
    destinatario,
    sucesso,
    erro: sucesso ? null : (evento.data?.bounce?.message ?? evento.type),
  };
}
