// src/infrastructure/alertas/alerta.service.ts
import { env } from "@/shared/env";
import { db } from "@/infrastructure/db/client";
import { logAlerta } from "@/infrastructure/db/schema/logs";
import { enviarEmail } from "@/infrastructure/email/client";

/**
 * Alerta operacional em três canais (RNF-031 / F9-11).
 *
 * Três canais porque cada um falha de um jeito diferente: e-mail depende do
 * Resend estar de pé, webhook depende do time ler o canal, e Sentry é o único
 * que sobrevive ao banco fora do ar. Se um cair, o alerta ainda sai pelos
 * outros — e o registro em `log_alerta` guarda o resultado de cada um, porque
 * "alertado" sem dizer por onde não serve para apurar incidente.
 *
 * Regra de honestidade: canal não configurado é `pulado`, não `sucesso`.
 * `entregue` só é true quando algum canal confirmou e nenhum falhou.
 */

export type SeveridadeAlerta = "info" | "aviso" | "critico";
export type CanalAlerta = "email" | "webhook" | "sentry";

export interface ResultadoCanal {
  canal: CanalAlerta;
  sucesso: boolean;
  pulado: boolean;
  erro?: string;
}

export interface AlertaInput {
  tipo: string;
  severidade: SeveridadeAlerta;
  mensagem: string;
  contexto?: Record<string, unknown>;
}

export interface ResultadoAlerta {
  canais: ResultadoCanal[];
  entregue: boolean;
  registrado: boolean;
}

function destinoEmail(): string | undefined {
  return env.ADMIN_EMAIL_INSTITUCIONAL ?? env.ADMIN_EMAIL_DPO;
}

async function porEmail(input: AlertaInput): Promise<ResultadoCanal> {
  const destino = destinoEmail();
  if (!destino) {
    return {
      canal: "email",
      sucesso: false,
      pulado: true,
      erro: "ADMIN_EMAIL_INSTITUCIONAL não configurado",
    };
  }

  const detalhes = Object.entries(input.contexto ?? {})
    .map(([chave, valor]) => `${chave}: ${String(valor)}`)
    .join("\n");

  const texto = `[${input.severidade.toUpperCase()}] ${input.tipo}\n\n${input.mensagem}\n\n${detalhes}`;
  const html =
    `<p><strong>[${input.severidade.toUpperCase()}] ${input.tipo}</strong></p>` +
    `<p>${input.mensagem}</p>` +
    (detalhes ? `<pre>${detalhes}</pre>` : "");

  const resultado = await enviarEmail({
    to: destino,
    subject: `[ALERTA] ${input.tipo} - Diretório Comunitário`,
    html,
    text: texto,
  });

  return {
    canal: "email",
    sucesso: resultado.success,
    pulado: false,
    erro: resultado.error,
  };
}

async function porWebhook(input: AlertaInput): Promise<ResultadoCanal> {
  const url = env.ALERTA_WEBHOOK_URL;
  if (!url) {
    return {
      canal: "webhook",
      sucesso: false,
      pulado: true,
      erro: "ALERTA_WEBHOOK_URL não configurada",
    };
  }

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // `text` atende Slack, `content` atende Discord: um payload serve os dois.
      body: JSON.stringify({
        text: `[${input.severidade.toUpperCase()}] ${input.tipo}: ${input.mensagem}`,
        content: `[${input.severidade.toUpperCase()}] ${input.tipo}: ${input.mensagem}`,
        contexto: input.contexto ?? {},
      }),
      signal: AbortSignal.timeout(5000),
    });

    return {
      canal: "webhook",
      sucesso: resposta.ok,
      pulado: false,
      erro: resposta.ok ? undefined : `HTTP ${resposta.status}`,
    };
  } catch (erro) {
    return {
      canal: "webhook",
      sucesso: false,
      pulado: false,
      erro: erro instanceof Error ? erro.message : "erro desconhecido",
    };
  }
}

async function porSentry(input: AlertaInput): Promise<ResultadoCanal> {
  if (!env.SENTRY_DSN) {
    return {
      canal: "sentry",
      sucesso: false,
      pulado: true,
      erro: "SENTRY_DSN não configurado",
    };
  }

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureMessage(`${input.tipo}: ${input.mensagem}`, {
      level:
        input.severidade === "critico"
          ? "error"
          : input.severidade === "aviso"
            ? "warning"
            : "info",
      extra: input.contexto,
    });
    return { canal: "sentry", sucesso: true, pulado: false };
  } catch (erro) {
    return {
      canal: "sentry",
      sucesso: false,
      pulado: false,
      erro: erro instanceof Error ? erro.message : "erro desconhecido",
    };
  }
}

export async function dispararAlerta(
  input: AlertaInput,
): Promise<ResultadoAlerta> {
  const canais = await Promise.all([
    porEmail(input),
    porWebhook(input),
    porSentry(input),
  ]);
  const entregue =
    canais.some((canal) => canal.sucesso) &&
    canais.every((canal) => canal.sucesso || canal.pulado);

  let registrado = false;
  try {
    await db.insert(logAlerta).values({
      tipo: input.tipo,
      severidade: input.severidade,
      mensagem: input.mensagem,
      contexto: input.contexto ?? null,
      canais,
      entregue,
    });
    registrado = true;
  } catch (erro) {
    // Nunca deixar o alerta derrubar o fluxo que o disparou.
    console.error("[Alerta] Falha ao registrar em log_alerta:", erro);
  }

  return { canais, entregue, registrado };
}
