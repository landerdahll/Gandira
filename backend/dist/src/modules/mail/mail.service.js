"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const resend_1 = require("resend");
let MailService = MailService_1 = class MailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MailService_1.name);
        this.resend = null;
        const apiKey = config.get('RESEND_API_KEY');
        this.fromAddress = config.get('RESEND_FROM', 'onboarding@resend.dev');
        this.devMode = !apiKey;
        if (apiKey) {
            this.resend = new resend_1.Resend(apiKey);
        }
    }
    async sendTicketTransferEmail(to, subject, message, actionUrl) {
        const button = actionUrl ? `<p style="margin:28px 0"><a href="${actionUrl}" style="background:#67bed9;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700">Abrir no Gandira</a></p>` : '';
        const html = `<!doctype html><html><body style="margin:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#fff"><div style="max-width:480px;margin:40px auto;background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:32px"><img src="https://gandira.vercel.app/gandira-logo.png" alt="Gandira" style="height:36px"><h1 style="font-size:20px;margin:28px 0 12px">${subject}</h1><p style="color:#999;line-height:1.6">${message}</p>${button}<p style="color:#444;font-size:12px;margin-top:32px">© ${new Date().getFullYear()} Gandira</p></div></body></html>`;
        if (this.devMode) {
            this.logger.warn(`E-mail de transferência (dev) — ${to}: ${subject}${actionUrl ? ` | ${actionUrl}` : ''}`);
            return;
        }
        const { error } = await this.resend.emails.send({ from: `Gandira <${this.fromAddress}>`, to, subject, html });
        if (error)
            throw new Error(error.message);
    }
    async sendVerificationEmail(to, name, verifyUrl) {
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;max-width:480px;width:100%;">
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #1a1a1a;">
            <img src="https://gandira.vercel.app/gandira-logo.png" alt="Gandira" style="height:36px;display:block;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">Confirme seu e-mail</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
              Olá, ${name}. Clique no botão abaixo para confirmar seu e-mail e liberar a compra de ingressos. O link é válido por <strong style="color:#aaa">24 horas</strong>.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:12px;background:#67bed9;box-shadow:0 0 24px rgba(103,190,217,0.3);">
                  <a href="${verifyUrl}" target="_blank"
                     style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                    Verificar e-mail
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:12px;color:#444;line-height:1.6;">
              Se você não criou uma conta na Gandira, ignore este e-mail.
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:#333;word-break:break-all;">
              Link direto: <a href="${verifyUrl}" style="color:#67bed9;text-decoration:none;">${verifyUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;">
            <p style="margin:0;font-size:12px;color:#333;text-align:center;">
              © ${new Date().getFullYear()} Gandira — Todos os direitos reservados
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
        if (this.devMode) {
            this.logger.warn('⚠️  RESEND_API_KEY não configurado — link de verificação:');
            this.logger.warn(`📧  Para: ${to}`);
            this.logger.warn(`🔗  ${verifyUrl}`);
            return;
        }
        const { error } = await this.resend.emails.send({
            from: `Gandira <${this.fromAddress}>`,
            to,
            subject: 'Confirme seu e-mail — Gandira',
            html,
        });
        if (error) {
            this.logger.error(`Falha ao enviar e-mail de verificação para ${to}: ${error.message}`);
        }
        else {
            this.logger.log(`E-mail de verificação enviado para ${to}`);
        }
    }
    async sendOrderConfirmation(to, name, data) {
        const fmtDate = (d) => new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        }).format(d);
        const fmtCurrency = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const itemsHtml = data.items.map(i => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#ccc;font-size:14px;">${i.batchName}</td>
        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#888;font-size:14px;text-align:center;">${i.quantity}</td>
      </tr>`).join('');
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;max-width:480px;width:100%;">
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #1a1a1a;">
            <img src="https://gandira.vercel.app/gandira-logo.png" alt="Gandira" style="height:36px;display:block;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff;">Pedido confirmado! 🎉</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
              Olá, ${name}. Seu pagamento foi aprovado e seus ingressos estão garantidos.
            </p>

            <div style="background:#0d1e28;border:1px solid #67bed922;border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#fff;">${data.eventTitle}</p>
              <p style="margin:0 0 4px;font-size:13px;color:#67bed9;">${fmtDate(data.eventDate)}</p>
              <p style="margin:0;font-size:13px;color:#666;">${data.venue}</p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <thead>
                <tr>
                  <th style="text-align:left;font-size:12px;color:#555;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ingresso</th>
                  <th style="text-align:center;font-size:12px;color:#555;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Qtd</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div style="display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid #252525;margin-bottom:28px;">
              <span style="font-size:14px;font-weight:700;color:#fff;">Total pago</span>
              <span style="font-size:14px;font-weight:700;color:#67bed9;">${fmtCurrency(data.total)}</span>
            </div>

            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="border-radius:12px;background:#67bed9;box-shadow:0 0 24px rgba(103,190,217,0.3);text-align:center;">
                  <a href="${data.myTicketsUrl}" target="_blank"
                     style="display:block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
                    Ver meus ingressos
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;">
            <p style="margin:0;font-size:12px;color:#333;text-align:center;">
              © ${new Date().getFullYear()} Gandira — Todos os direitos reservados
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
        if (this.devMode) {
            this.logger.warn(`⚠️  Confirmação de pedido (dev) — Para: ${to} | Evento: ${data.eventTitle}`);
            return;
        }
        const { error } = await this.resend.emails.send({
            from: `Gandira <${this.fromAddress}>`,
            to,
            subject: `Ingresso confirmado — ${data.eventTitle}`,
            html,
        });
        if (error) {
            this.logger.error(`Falha ao enviar confirmação de pedido para ${to}: ${error.message}`);
        }
        else {
            this.logger.log(`Confirmação de pedido enviada para ${to}`);
        }
    }
    async sendPasswordReset(to, name, resetUrl) {
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;max-width:480px;width:100%;">
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #1a1a1a;">
            <img src="https://gandira.vercel.app/gandira-logo.png" alt="Gandira" style="height:36px;display:block;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">Redefinição de senha</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
              Olá, ${name}. Recebemos uma solicitação para redefinir a senha da sua conta Gandira.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
              Clique no botão abaixo para criar uma nova senha. O link é válido por <strong style="color:#aaa">1 hora</strong>.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:12px;background:#67bed9;box-shadow:0 0 24px rgba(103,190,217,0.3);">
                  <a href="${resetUrl}" target="_blank"
                     style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                    Redefinir senha
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:12px;color:#444;line-height:1.6;">
              Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:#333;word-break:break-all;">
              Link direto: <a href="${resetUrl}" style="color:#67bed9;text-decoration:none;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;">
            <p style="margin:0;font-size:12px;color:#333;text-align:center;">
              © ${new Date().getFullYear()} Gandira — Todos os direitos reservados
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
        if (this.devMode) {
            this.logger.warn('⚠️  RESEND_API_KEY não configurado — link de redefinição:');
            this.logger.warn(`📧  Para: ${to}`);
            this.logger.warn(`🔗  ${resetUrl}`);
            return;
        }
        const { error } = await this.resend.emails.send({
            from: `Gandira <${this.fromAddress}>`,
            to,
            subject: 'Redefinição de senha — Gandira',
            html,
        });
        if (error) {
            this.logger.error(`Falha ao enviar e-mail de redefinição para ${to}: ${error.message}`);
        }
        else {
            this.logger.log(`E-mail de redefinição enviado para ${to}`);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map