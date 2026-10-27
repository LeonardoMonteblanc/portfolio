// src/infrastructure/email/templates.ts

export function gerarEmailRecuperacaoSenha(token: string): {
  html: string;
  text: string;
} {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/recuperar-senha?token=${token}&stage=redefinir`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redefinir senha - Diretório Comunitário</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h1 style="color: #1e40af; margin-bottom: 24px;">Redefinir sua senha</h1>
    <p style="margin-bottom: 16px;">Olá,</p>
    <p style="margin-bottom: 16px;">Recebemos uma solicitação para redefinir a senha da sua conta de administrador no Diretório Comunitário.</p>
    <p style="margin-bottom: 24px;">Clique no botão abaixo para criar uma nova senha:</p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${url}" style="background: #1e40af; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 600;">Redefinir senha</a>
    </div>
    <p style="margin-bottom: 16px; font-size: 14px; color: #666;">Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; font-size: 13px; color: #888; background: #f1f1f1; padding: 12px; border-radius: 4px;">${url}</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 13px; color: #888; margin-bottom: 8px;">Este link expira em <strong>30 minutos</strong>.</p>
    <p style="font-size: 13px; color: #888;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Redefinir sua senha - Diretório Comunitário

Olá,

Recebemos uma solicitação para redefinir a senha da sua conta de administrador no Diretório Comunitário.

Clique no link abaixo para criar uma nova senha:
${url}

Este link expira em 30 minutos.

Se você não solicitou isso, pode ignorar este e-mail com segurança.

--
Diretório Comunitário de Bento Gonçalves
  `.trim();

  return { html, text };
}

export function gerarEmailSugestaoCategoria(
  nomeSolicitante: string,
  sugestao: string,
  aceita: boolean,
): { html: string; text: string } {
  const status = aceita ? "aceita" : "rejeitada";
  const cor = aceita ? "#059669" : "#dc2626";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sugestão de categoria ${status} - Diretório Comunitário</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h1 style="color: ${cor}; margin-bottom: 24px;">Sua sugestão de categoria foi ${status}</h1>
    <p style="margin-bottom: 16px;">Olá <strong>${nomeSolicitante}</strong>,</p>
    <p style="margin-bottom: 16px;">Sua sugestão de categoria <strong>"${sugestao}"</strong> foi <strong style="color: ${cor};">${status}</strong> pela administração.</p>
    ${aceita ? '<p style="margin-bottom: 16px;">Ela já está disponível para uso no formulário de solicitação.</p>' : '<p style="margin-bottom: 16px;">Motivo: não atende aos critérios de categorização atuais.</p>'}
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 13px; color: #888;">Diretório Comunitário de Bento Gonçalves</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Sua sugestão de categoria foi ${status}

Olá ${nomeSolicitante},

Sua sugestão de categoria "${sugestao}" foi ${status} pela administração.

${aceita ? "Ela já está disponível para uso no formulário de solicitação." : "Motivo: não atende aos critérios de categorização atuais."}

--
Diretório Comunitário de Bento Gonçalves
  `.trim();

  return { html, text };
}

export function gerarEmailCorrecaoDados(
  nomeAnunciante: string,
  campos: string[],
  prazoDias: number,
): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Correção de dados necessária - Diretório Comunitário</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h1 style="color: #dc2626; margin-bottom: 24px;">Correção de dados necessária</h1>
    <p style="margin-bottom: 16px;">Olá <strong>${nomeAnunciante}</strong>,</p>
    <p style="margin-bottom: 16px;">Ao analisar sua solicitação, identificamos que os seguintes campos precisam ser corrigidos:</p>
    <ul style="margin-bottom: 24px; padding-left: 20px;">
      ${campos.map((c) => `<li style="margin-bottom: 8px;">${c}</li>`).join("")}
    </ul>
    <p style="margin-bottom: 16px;">Você tem <strong>${prazoDias} dias corridos</strong> para enviar as correções.</p>
    <p style="margin-bottom: 16px;">Responda a este e-mail com as informações corrigidas ou acesse o painel para atualizar.</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 13px; color: #888;">Diretório Comunitário de Bento Gonçalves</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Correção de dados necessária - Diretório Comunitário

Olá ${nomeAnunciante},

Ao analisar sua solicitação, identificamos que os seguintes campos precisam ser corrigidos:

${campos.map((c) => `- ${c}`).join("\n")}

Você tem ${prazoDias} dias corridos para enviar as correções.

Responda a este e-mail com as informações corrigidas ou acesse o painel para atualizar.

--
Diretório Comunitário de Bento Gonçalves
  `.trim();

  return { html, text };
}
