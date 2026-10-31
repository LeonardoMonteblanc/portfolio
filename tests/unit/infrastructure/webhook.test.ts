import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  interpretarEventoResend,
  verificarAssinaturaWebhook,
} from "@/infrastructure/email/webhook";

/**
 * F9-10 — verificação de assinatura do webhook do Resend (Svix).
 * Teste puro: não toca banco nem rede.
 */
const SEGREDO =
  "whsec_" + Buffer.from("segredo-de-teste-1234567890").toString("base64");

function assinar(
  id: string,
  timestamp: string,
  corpo: string,
  segredo = SEGREDO,
): string {
  const chave = Buffer.from(segredo.replace("whsec_", ""), "base64");
  const assinatura = crypto
    .createHmac("sha256", chave)
    .update(`${id}.${timestamp}.${corpo}`)
    .digest("base64");
  return `v1,${assinatura}`;
}

describe("webhook do Resend", () => {
  const corpo = JSON.stringify({
    type: "email.delivered",
    data: { to: ["a@b.com"] },
  });
  const agora = 1_800_000_000;
  const timestamp = String(agora);

  it("aceita assinatura válida", () => {
    const resultado = verificarAssinaturaWebhook({
      segredo: SEGREDO,
      id: "msg_1",
      timestamp,
      assinatura: assinar("msg_1", timestamp, corpo),
      corpo,
      agoraSegundos: agora,
    });

    expect(resultado).toEqual({ valido: true });
  });

  it("rejeita corpo alterado", () => {
    const resultado = verificarAssinaturaWebhook({
      segredo: SEGREDO,
      id: "msg_1",
      timestamp,
      assinatura: assinar("msg_1", timestamp, corpo),
      corpo: corpo.replace("a@b.com", "invasor@b.com"),
      agoraSegundos: agora,
    });

    expect(resultado).toEqual({ valido: false, motivo: "assinatura_invalida" });
  });

  it("rejeita timestamp fora da janela (replay)", () => {
    const antigo = String(agora - 3600);
    const resultado = verificarAssinaturaWebhook({
      segredo: SEGREDO,
      id: "msg_1",
      timestamp: antigo,
      assinatura: assinar("msg_1", antigo, corpo),
      corpo,
      agoraSegundos: agora,
    });

    expect(resultado.motivo).toBe("timestamp_fora_da_janela");
  });

  it("falha fechada sem segredo ou sem cabeçalhos", () => {
    expect(
      verificarAssinaturaWebhook({
        segredo: "",
        id: "msg_1",
        timestamp,
        assinatura: "v1,abc",
        corpo,
      }).motivo,
    ).toBe("segredo_ausente");

    expect(
      verificarAssinaturaWebhook({
        segredo: SEGREDO,
        id: null,
        timestamp,
        assinatura: null,
        corpo,
      }).motivo,
    ).toBe("cabecalhos_ausentes");
  });

  it("aceita quando o header traz múltiplas assinaturas", () => {
    const valida = assinar("msg_1", timestamp, corpo);
    const resultado = verificarAssinaturaWebhook({
      segredo: SEGREDO,
      id: "msg_1",
      timestamp,
      assinatura: `v1,AAAASSINATURAANTIGA= ${valida}`,
      corpo,
      agoraSegundos: agora,
    });

    expect(resultado.valido).toBe(true);
  });

  it("interpreta entrega e bounce", () => {
    expect(
      interpretarEventoResend({
        type: "email.delivered",
        data: { to: ["a@b.com"] },
      }),
    ).toEqual({
      tipo: "webhook_email_delivered",
      destinatario: "a@b.com",
      sucesso: true,
      erro: null,
    });

    expect(
      interpretarEventoResend({
        type: "email.bounced",
        data: { to: ["a@b.com"], bounce: { message: "mailbox full" } },
      }),
    ).toEqual({
      tipo: "webhook_email_bounced",
      destinatario: "a@b.com",
      sucesso: false,
      erro: "mailbox full",
    });
  });
});
