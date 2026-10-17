import { Resend } from "resend";
import { env } from "../config/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viva Conecta</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F9FA;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1A1A1A;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #F8F9FA;
      padding: 40px 16px;
    }
    .card {
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      padding: 36px 32px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .brand {
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }
    .brand span {
      color: #FF5A36;
    }
    .btn {
      display: inline-block;
      background-color: #FF5A36;
      color: #FFFFFF !important;
      font-weight: 600;
      font-size: 15px;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 24px 0;
      text-align: center;
    }
    .footer {
      max-width: 540px;
      margin: 24px auto 0;
      font-size: 12px;
      color: #64748B;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand">Viva<span>Conecta</span></div>
      ${content}
    </div>
    <div class="footer">
      Viva Sem Fronteiras · Este é um e-mail automático do sistema.
    </div>
  </div>
</body>
</html>
`;
}

export async function enviarRecuperacaoSenha(options: {
  email: string;
  nome?: string;
  token: string;
}) {
  const link = `${env.FRONTEND_URL}/nova-senha?token=${options.token}`;

  if (!resend) {
    console.log(`\n📧 [RESEND MOCK] Recuperação de senha para: ${options.email}`);
    console.log(`🔗 Link de redefinição: ${link}\n`);
    return { success: true, mocked: true };
  }

  const html = emailLayout(`
    <h2 style="font-size: 18px; margin-top: 0; color: #0F172A;">Recuperação de Senha</h2>
    <p>Olá${options.nome ? `, ${options.nome}` : ""},</p>
    <p>Recebemos uma solicitação para redefinir a sua senha no <strong>Viva Conecta</strong>.</p>
    <p>Clique no botão abaixo para cadastrar uma nova senha:</p>
    <div style="text-align: center;">
      <a href="${link}" class="btn" target="_blank">Redefinir minha senha</a>
    </div>
    <p style="font-size: 13px; color: #64748B;">Ou copie e cole este link no seu navegador:<br><a href="${link}" style="color: #FF5A36; word-break: break-all;">${link}</a></p>
    <p style="font-size: 13px; color: #64748B;">Este link expira em <strong>1 hora</strong> e é de uso único. Se você não solicitou, nenhuma ação é necessária.</p>
  `);

  try {
    const data = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.email,
      subject: "Viva Conecta · Redefinição de senha",
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao enviar e-mail pelo Resend:", error);
    return { success: false, error };
  }
}

export async function enviarConviteUsuario(options: {
  email: string;
  nome: string;
  token: string;
  tipo: "administrador" | "editor" | "parceiro";
}) {
  const link = `${env.FRONTEND_URL}/convite/${options.token}`;

  if (!resend) {
    console.log(`\n📧 [RESEND MOCK] Convite para novo usuário: ${options.email} (${options.tipo})`);
    console.log(`🔗 Link do convite: ${link}\n`);
    return { success: true, mocked: true };
  }

  const cargoDescricao =
    options.tipo === "parceiro"
      ? "Parceiro Oficial"
      : options.tipo === "editor"
        ? "Editor da plataforma"
        : "Administrador";

  const html = emailLayout(`
    <h2 style="font-size: 18px; margin-top: 0; color: #0F172A;">Bem-vindo ao Viva Conecta!</h2>
    <p>Olá, <strong>${options.nome}</strong>,</p>
    <p>Você foi convidado para acessar o <strong>Viva Conecta</strong> como <strong>${cargoDescricao}</strong>.</p>
    <p>Para ativar sua conta e definir sua senha de acesso, clique no botão abaixo:</p>
    <div style="text-align: center;">
      <a href="${link}" class="btn" target="_blank">Ativar conta e criar senha</a>
    </div>
    <p style="font-size: 13px; color: #64748B;">Ou copie e cole este link no seu navegador:<br><a href="${link}" style="color: #FF5A36; word-break: break-all;">${link}</a></p>
    <p style="font-size: 13px; color: #64748B;">Este convite é válido por <strong>5 dias</strong>.</p>
  `);

  try {
    const data = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.email,
      subject: "Viva Conecta · Você foi convidado para a plataforma",
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao enviar convite pelo Resend:", error);
    return { success: false, error };
  }
}
