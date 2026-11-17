import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface TwoFactorEmailThemeColors {
  primary?: string;
  background?: string;
  surface?: string;
  surfaceSecondary?: string;
  text?: string;
  textMuted?: string;
  border?: string;
}

export interface TwoFactorEmailTheme extends TwoFactorEmailThemeColors {
  mode?: "light" | "dark" | "amoled";
  amoled?: boolean;
  monet?: boolean;
  colors?: TwoFactorEmailThemeColors;
}

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function sanitizeHexColor(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (HEX_COLOR_REGEX.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }
  return fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mixHex(hexA: string, hexB: string, weightA: number): string {
  const w = Math.max(0, Math.min(1, weightA));
  const parse = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r1 * w + r2 * (1 - w))}${toHex(g1 * w + g2 * (1 - w))}${toHex(b1 * w + b2 * (1 - w))}`;
}

function getRelativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastTextColor(hex: string): string {
  return getRelativeLuminance(hex) > 0.36 ? "#0F172A" : "#FFFFFF";
}

function formatOtpCode(code: string): string {
  const trimmed = code.trim();
  if (/^[A-Za-z0-9]{6}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
  }
  return trimmed;
}

function resolveEmailPalette(theme?: TwoFactorEmailTheme) {
  const isAmoled = theme?.mode === "amoled" || theme?.amoled === true;
  const isDark = !isAmoled && theme?.mode === "dark";

  const defaults = isAmoled
    ? {
        background: "#000000",
        surface: "#0A0A0A",
        surfaceSecondary: "#141414",
        text: "#FFFFFF",
        textMuted: "#A1A1AA",
        border: "#1F1F23",
      }
    : isDark
      ? {
          background: "#0B1220",
          surface: "#111827",
          surfaceSecondary: "#1E293B",
          text: "#F8FAFC",
          textMuted: "#94A3B8",
          border: "#1F2937",
        }
      : {
          background: "#F4F7F5",
          surface: "#FFFFFF",
          surfaceSecondary: "#F1F5F9",
          text: "#0F172A",
          textMuted: "#64748B",
          border: "#E2E8F0",
        };

  const c = theme?.colors;
  const primary = sanitizeHexColor(c?.primary ?? theme?.primary, "#10B981");
  const isDarkSurface = isAmoled || isDark;

  return {
    isDarkSurface,
    background: sanitizeHexColor(c?.background ?? theme?.background, defaults.background),
    surface: sanitizeHexColor(c?.surface ?? theme?.surface, defaults.surface),
    surfaceSecondary: sanitizeHexColor(c?.surfaceSecondary ?? theme?.surfaceSecondary, defaults.surfaceSecondary),
    text: sanitizeHexColor(c?.text ?? theme?.text, defaults.text),
    textMuted: sanitizeHexColor(c?.textMuted ?? theme?.textMuted, defaults.textMuted),
    border: sanitizeHexColor(c?.border ?? theme?.border, defaults.border),
    primary,
    primaryContrast: getContrastTextColor(primary),
  };
}

export function renderTwoFactorEmailHtml(
  userName: string,
  code: string,
  theme?: TwoFactorEmailTheme,
): string {
  const palette = resolveEmailPalette(theme);
  const apiBaseUrl = (process.env.PUBLIC_URL || "https://eq.projetoscti.com.br/26-presco").replace(/\/+$/, "");
  const logoUrl = `${apiBaseUrl}/images/brand-logo?mode=${palette.isDarkSurface ? "dark" : "light"}`;
  const safeName = escapeHtml(userName?.trim() || "Economizador");
  const safeCode = escapeHtml(formatOtpCode(code));
  const currentYear = new Date().getFullYear();

  const badgeBg = mixHex(palette.primary, palette.surface, palette.isDarkSurface ? 0.16 : 0.12);
  const badgeBorder = mixHex(palette.primary, palette.surface, palette.isDarkSurface ? 0.36 : 0.28);
  const badgeText = palette.isDarkSurface
    ? getRelativeLuminance(palette.primary) > 0.2
      ? palette.primary
      : mixHex(palette.primary, "#FFFFFF", 0.55)
    : getRelativeLuminance(palette.primary) < 0.22
      ? palette.primary
      : mixHex(palette.primary, "#0F172A", 0.55);

  const otpBorder = mixHex(palette.primary, palette.border, palette.isDarkSurface ? 0.42 : 0.35);
  const otpBg = mixHex(palette.primary, palette.surfaceSecondary, palette.isDarkSurface ? 0.06 : 0.04);
  const codeTextColor = palette.isDarkSurface
    ? getRelativeLuminance(palette.primary) > 0.22
      ? palette.primary
      : palette.text
    : palette.text;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificação em 2 Etapas - Presco</title>
</head>
<body style="margin:0;padding:32px 16px;background-color:${palette.background};color:${palette.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${palette.background};">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background-color:${palette.surface};border:1px solid ${palette.border};border-radius:20px;overflow:hidden;">
          <tr>
            <td height="3" style="background-color:${palette.primary};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 32px 20px 32px;border-bottom:1px solid ${palette.border};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:10px;">
                          <img src="${logoUrl}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:7px;" />
                        </td>
                        <td valign="middle">
                          <span style="font-size:20px;font-weight:800;letter-spacing:-0.03em;line-height:1;color:${palette.text};">Presco</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;background-color:${badgeBg};border:1px solid ${badgeBorder};color:${badgeText};font-size:11px;font-weight:700;letter-spacing:0.02em;line-height:1.2;padding:5px 12px;border-radius:999px;white-space:nowrap;">Verificação em 2 Etapas</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 28px 32px;">
              <h1 style="margin:0 0 10px 0;font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${palette.text};">Olá, ${safeName}</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${palette.textMuted};">
                Use o código abaixo para confirmar sua identidade e concluir a verificação em duas etapas da sua conta Presco.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;">
                <tr>
                  <td align="center" style="background-color:${otpBg};border:1.5px solid ${otpBorder};border-radius:16px;padding:20px 16px 24px 16px;">
                    <div style="margin:0 0 10px 0;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${palette.textMuted};">
                      Código de verificação
                    </div>
                    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:36px;font-weight:800;letter-spacing:6px;line-height:1.1;font-variant-numeric:tabular-nums;color:${codeTextColor};padding-left:6px;">
                      ${safeCode}
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;background-color:${palette.surfaceSecondary};border:1px solid ${palette.border};border-radius:10px;">
                <tr>
                  <td align="left" style="padding:10px 14px;font-size:12px;line-height:1.4;color:${palette.textMuted};">
                    Válido por <strong style="color:${palette.text};font-weight:600;">10 minutos</strong>
                  </td>
                  <td align="right" style="padding:10px 14px;font-size:12px;line-height:1.4;color:${palette.textMuted};">
                    <strong style="color:${palette.text};font-weight:600;">Uso único</strong>
                  </td>
                </tr>
              </table>
              <p style="margin:0;padding-top:18px;border-top:1px solid ${palette.border};font-size:12px;line-height:1.6;color:${palette.textMuted};">
                Se você não solicitou esta verificação, pode ignorar este e-mail com segurança. Nunca compartilhe este código com terceiros.
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding:18px 16px 0 16px;font-size:12px;line-height:1.5;color:${palette.textMuted};">
              &copy; ${currentYear} Presco. Todos os direitos reservados.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

class EmailServiceClass {
  /**
   * Envia o código de 6 dígitos de verificação de duas etapas para o e-mail do usuário via SMTP (primário) ou Resend API (fallback).
   */
  async sendTwoFactorCode(
    toEmail: string,
    userName: string,
    code: string,
    theme?: TwoFactorEmailTheme,
  ): Promise<boolean> {
    const fromAddress = env.SMTP_FROM || env.RESEND_FROM || "Presco <noreply@presco.app>";
    const subject = `Seu código de verificação Presco: ${code}`;
    const html = renderTwoFactorEmailHtml(userName, code, theme);

    // In test environments, mock delivery to avoid external network latency and rate limits
    if (env.NODE_ENV === "test") {
      console.log(`[Email] Mock dispatch in test mode for: ${toEmail}`);
      console.log(`[AUTH] [2FA CODE LOG FOR TESTING] Email: ${toEmail} | Code: ${code}`);
      return true;
    }

    // Primary delivery: SMTP via nodemailer
    if (env.SMTP_HOST) {
      try {
        console.log(`[SMTP] Dispatching 2FA verification email to: ${toEmail} via ${env.SMTP_HOST}:${env.SMTP_PORT}`);
        const transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          ...(env.SMTP_USER
            ? {
                auth: {
                  user: env.SMTP_USER,
                  pass: env.SMTP_PASS,
                },
              }
            : {}),
        });

        const info = await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject,
          html,
        });

        console.log(`[SMTP] 2FA verification email successfully delivered. MessageId: ${info.messageId}`);
        return true;
      } catch (error) {
        console.error("[SMTP] Error sending 2FA email:", error);
        console.log(`[AUTH] [2FA CODE LOG FOR TESTING] Email: ${toEmail} | Code: ${code}`);
        return false;
      }
    }

    // Fallback delivery: Resend API if SMTP_HOST is unset
    if (!env.RESEND_API_KEY) {
      console.log(`[Email] Mock dispatch in ${env.NODE_ENV || "development"} mode for: ${toEmail}`);
      console.log(`[AUTH] [2FA CODE LOG FOR TESTING] Email: ${toEmail} | Code: ${code}`);
      return true;
    }

    try {
      console.log(`[Resend] Dispatching 2FA verification email to: ${toEmail}`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_FROM || fromAddress,
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
        console.log(`[AUTH] [2FA CODE LOG FOR TESTING] Email: ${toEmail} | Code: ${code}`);
        return false;
      }

      console.log(`[Resend] 2FA verification email successfully delivered. ID: ${responseData?.id}`);
      return true;
    } catch (error) {
      console.error("[Resend] Network error when sending 2FA email:", error);
      console.log(`[AUTH] [2FA CODE LOG FOR TESTING] Email: ${toEmail} | Code: ${code}`);
      return false;
    }
  }
}

export const emailService = new EmailServiceClass();
