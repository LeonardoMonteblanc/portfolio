// src/infrastructure/email/client.ts
import { Resend } from "resend";
import { env } from "@/shared/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function enviarEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function enviarEmailRecuperacaoSenha(
  email: string,
  token: string,
): Promise<void> {
  const { html, text } = await import("@/infrastructure/email/templates").then(
    (m) => m.gerarEmailRecuperacaoSenha(token),
  );
  await enviarEmail({
    to: email,
    subject: "Redefinir sua senha - Diretório Comunitário",
    html,
    text,
  });
}

export async function enviarEmailSugestaoCategoria(
  email: string,
  nomeSolicitante: string,
  sugestao: string,
  aceita: boolean,
): Promise<void> {
  const { html, text } = await import("@/infrastructure/email/templates").then(
    (m) => m.gerarEmailSugestaoCategoria(nomeSolicitante, sugestao, aceita),
  );
  await enviarEmail({
    to: email,
    subject: `Sua sugestão de categoria foi ${aceita ? "aceita" : "rejeitada"} - Diretório Comunitário`,
    html,
    text,
  });
}

export async function enviarEmailCorrecaoDados(
  email: string,
  nomeAnunciante: string,
  campos: string[],
  prazoDias: number,
): Promise<void> {
  const { html, text } = await import("@/infrastructure/email/templates").then(
    (m) => m.gerarEmailCorrecaoDados(nomeAnunciante, campos, prazoDias),
  );
  await enviarEmail({
    to: email,
    subject: "Correção de dados necessária - Diretório Comunitário",
    html,
    text,
  });
}
