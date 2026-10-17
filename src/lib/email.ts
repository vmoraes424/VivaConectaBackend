import { Resend } from "resend";
import { env } from "../config/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function getFrontendBaseUrl(): string {
  const firstUrl = env.FRONTEND_URL.split(",")[0]?.trim();
  return (firstUrl || "http://localhost:3000").replace(/\/$/, "");
}

export interface EmailTemplateOptions {
  title: string;
  previewText?: string;
  heading: string;
  paragraphs: string[];
  buttonText: string;
  buttonUrl: string;
  secondaryNotice?: string;
}

export function renderEmailTemplate(options: EmailTemplateOptions): string {
  const preview = options.previewText || options.heading;
  const invisibleSpacing = "&#847;&zwnj;&nbsp;".repeat(30);

  const paragraphsHtml = options.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1B365C">${p}</p>`,
    )
    .join("");

  const secondaryHtml = options.secondaryNotice
    ? `<tr><td style="padding:0 40px 24px"><p style="margin:0 0 8px;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:20px;color:#626C80">Se o botão acima não funcionar, copie e cole este link no seu navegador:<br><a target="_blank" rel="noopener" href="${options.buttonUrl}" style="color:#FF5436;word-break:break-all">${options.buttonUrl}</a></p><p style="margin:0;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:20px;color:#626C80">${options.secondaryNotice}</p></td></tr>`
    : "";

  return `<!doctype html><html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${options.title}</title><!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]--></head><body style="margin:0;padding:0;background:#F7F9FC"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}${invisibleSpacing}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F9FC"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #D6DFEC;border-radius:16px;border-collapse:separate"><tr><td style="padding:32px 40px 0"><img src="https://storybook.vivasf.com.br/email/logo-email.png" width="128" height="80" alt="Viva Sem Fronteiras" style="display:block;border:0"></td></tr><tr><td style="padding:24px 40px 0"><div style="width:32px;height:3px;background:#FF5436;line-height:3px;font-size:0">&nbsp;</div></td></tr><tr><td style="padding:16px 40px 8px;font-family:Arial, Helvetica, sans-serif;font-size:26px;line-height:32px;font-weight:bold;color:#00152F">${options.heading}</td></tr><tr><td style="padding:8px 40px 8px">${paragraphsHtml}</td></tr><tr><td align="center" style="padding:8px 40px 32px"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${options.buttonUrl}" style="height:56px;v-text-anchor:middle;width:280px" arcsize="18%" stroke="f" fillcolor="#FF5436"><w:anchorlock/><center style="color:#FFFFFF;font-family:Arial, Helvetica, sans-serif;font-size:20px;font-weight:bold">${options.buttonText}</center></v:roundrect><![endif]--><!--[if !mso]><!--><a target="_blank" rel="noopener" href="${options.buttonUrl}" style="display:block;box-sizing:border-box;width:100%;max-width:280px;margin:0 auto;padding:16px 24px;border-radius:10px;background:#FF5436;color:#FFFFFF;text-align:center;text-decoration:none;font-family:Arial, Helvetica, sans-serif;font-size:20px;line-height:24px;font-weight:bold">${options.buttonText}</a><!--<![endif]--></td></tr>${secondaryHtml}<tr><td align="center" style="padding:24px 40px;border-top:1px solid #D6DFEC;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:20px;color:#626C80;text-align:center"><strong style="color:#00152F">Viva Além!</strong><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:12px auto"><tr><td style="padding:0 8px"><a target="_blank" rel="noopener" href="https://www.instagram.com/vivasemfronteirasbr"><img src="https://storybook.vivasf.com.br/email/social-instagram.png" width="24" height="24" alt="Instagram" style="display:block;border:0"></a></td><td style="padding:0 8px"><a target="_blank" rel="noopener" href="https://www.youtube.com/@vivasemfronteirasbr"><img src="https://storybook.vivasf.com.br/email/social-youtube.png" width="24" height="24" alt="YouTube" style="display:block;border:0"></a></td><td style="padding:0 8px"><a target="_blank" rel="noopener" href="https://www.tiktok.com/@vivasemfronteiras"><img src="https://storybook.vivasf.com.br/email/social-tiktok.png" width="24" height="24" alt="TikTok" style="display:block;border:0"></a></td></tr></table><a target="_blank" rel="noopener" href="https://vivasf.com.br" style="color:#1B365C">vivasf.com.br</a><br><br>Você recebeu este e-mail porque faz parte da comunidade Viva Sem Fronteiras. <a target="_blank" rel="noopener" href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#626C80">Cancelar inscrição</a></td></tr></table></td></tr></table></body></html>`;
}

export async function enviarRecuperacaoSenha(options: {
  email: string;
  nome?: string;
  token: string;
}) {
  const baseUrl = getFrontendBaseUrl();
  const link = `${baseUrl}/nova-senha?token=${options.token}`;

  if (!resend) {
    console.log(`\n📧 [RESEND MOCK] Recuperação de senha para: ${options.email}`);
    console.log(`🔗 Link de redefinição: ${link}\n`);
    return { success: true, mocked: true };
  }

  const saudacao = options.nome ? `Olá, <strong>${options.nome}</strong>!` : "Olá!";
  const html = renderEmailTemplate({
    title: "Viva Conecta · Redefinição de senha",
    previewText: "Redefina sua senha de acesso à plataforma Viva Conecta.",
    heading: "Recuperação de Senha",
    paragraphs: [
      saudacao,
      "Recebemos uma solicitação para redefinir a sua senha de acesso ao <strong>Viva Conecta</strong>.",
      "Para cadastrar uma nova senha e restabelecer o seu acesso com segurança, clique no botão abaixo:",
    ],
    buttonText: "Redefinir senha",
    buttonUrl: link,
    secondaryNotice:
      "Este link é de uso único e expira em <strong>1 hora</strong>. Se você não solicitou a redefinição de senha, nenhuma ação é necessária e sua conta permanece segura.",
  });

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.email,
      subject: "Viva Conecta · Redefinição de senha",
      html,
    });
    if (error) {
      console.error("❌ [RESEND ERROR] Erro ao enviar recuperação de senha:", error);
      return { success: false, error };
    }
    console.log(`✅ [RESEND] E-mail de recuperação enviado para: ${options.email} (ID: ${data?.id})`);
    return { success: true, data };
  } catch (error) {
    console.error("❌ [RESEND EXCEPTION] Erro inesperado ao enviar e-mail pelo Resend:", error);
    return { success: false, error };
  }
}

export async function enviarConviteUsuario(options: {
  email: string;
  nome: string;
  token: string;
  tipo: "administrador" | "editor" | "parceiro";
}) {
  const baseUrl = getFrontendBaseUrl();
  const link = `${baseUrl}/convite/${options.token}`;

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

  const html = renderEmailTemplate({
    title: "Viva Conecta · Você foi convidado para a plataforma",
    previewText: "Você foi convidado para acessar a plataforma Viva Conecta.",
    heading: "Bem-vindo ao Viva Conecta!",
    paragraphs: [
      `Olá, <strong>${options.nome}</strong>!`,
      `Você foi convidado para acessar a plataforma <strong>Viva Conecta</strong> como <strong>${cargoDescricao}</strong>.`,
      "Para ativar a sua conta e definir sua senha de acesso, clique no botão abaixo:",
    ],
    buttonText: "Ativar minha conta",
    buttonUrl: link,
    secondaryNotice:
      "Este convite é individual, intransferível e válido por <strong>5 dias</strong>.",
  });

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.email,
      subject: "Viva Conecta · Você foi convidado para a plataforma",
      html,
    });
    if (error) {
      console.error("❌ [RESEND ERROR] Erro ao enviar convite de usuário:", error);
      return { success: false, error };
    }
    console.log(`✅ [RESEND] E-mail de convite enviado para: ${options.email} (ID: ${data?.id})`);
    return { success: true, data };
  } catch (error) {
    console.error("❌ [RESEND EXCEPTION] Erro inesperado ao enviar convite pelo Resend:", error);
    return { success: false, error };
  }
}
