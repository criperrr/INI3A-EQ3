import { env } from "../config/env";

class EmailServiceClass {
  /**
   * Envia o código de 6 dígitos de verificação de duas etapas para o e-mail do usuário via Resend API.
   */
  async sendTwoFactorCode(toEmail: string, userName: string, code: string): Promise<boolean> {
    const fromAddress = env.RESEND_FROM || "Presco <onboarding@resend.dev>";
    const subject = `Seu código de verificação Presco: ${code}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificação de Duas Etapas - Presco</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
    .container { max-width: 520px; margin: 0 auto; background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: linear-gradient(135deg, #10B981, #059669); padding: 32px 24px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; margin: 0; }
    .logo span { color: #A7F3D0; }
    .subtitle { color: #ECFDF5; font-size: 14px; margin-top: 6px; }
    .content { padding: 32px 24px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 600; color: #F1F5F9; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 24px; }
    .code-box { background-color: #0F172A; border: 2px dashed #10B981; border-radius: 12px; padding: 18px 24px; margin: 0 auto 24px; display: inline-block; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #10B981; margin: 0; }
    .badge { display: inline-block; background-color: rgba(16, 185, 129, 0.15); color: #34D399; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; margin-bottom: 20px; }
    .warning { font-size: 12px; color: #64748B; border-top: 1px solid #334155; padding-top: 20px; margin-top: 24px; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">P<span>resco</span></h1>
      <p class="subtitle">Comparador Colaborativo de Preços</p>
    </div>
    <div class="content">
      <div class="badge">Autenticação em 2 Etapas</div>
      <div class="greeting">Olá, ${userName || "Economizador"}!</div>
      <p class="text">
        Recebemos uma solicitação de verificação de segurança para sua conta. Use o código abaixo para habilitar publicações e interações na plataforma:
      </p>
      <div class="code-box">
        <p class="code">${code}</p>
      </div>
      <p class="text" style="font-size: 13px;">
        Este código expira em <strong>10 minutos</strong>. Se você não solicitou este código, ignore este e-mail com segurança.
      </p>
      <div class="warning">
        Por motivos de segurança, nunca compartilhe este código com ninguém. A equipe Presco nunca solicitará este código.
      </div>
    </div>
  </div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} Presco - Todos os direitos reservados.
  </div>
</body>
</html>
    `.trim();

    try {
      console.log(`[Resend] Dispatching 2FA verification email to: ${toEmail}`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          subject,
          html,
        }),
      });

      const responseData = (await response.json().catch(() => ({}))) as any;

      if (!response.ok) {
        console.warn(
          `[Resend] Warning: Resend API returned status ${response.status}:`,
          responseData?.message || responseData,
        );
        // Em ambientes de teste/desenvolvimento ou domínios não verificados, registramos o código no log para viabilizar testes imediatos
        console.log(`🔑 [2FA CODE LOG FOR TESTING] Email: ${toEmail} | Code: ${code}`);
        return false;
      }

      console.log(`[Resend] 2FA verification email successfully delivered. ID: ${responseData?.id}`);
      return true;
    } catch (error) {
      console.error("[Resend] Network error when sending 2FA email:", error);
      console.log(`🔑 [2FA CODE LOG FOR TESTING] Email: ${toEmail} | Code: ${code}`);
      return false;
    }
  }
}

export const emailService = new EmailServiceClass();
