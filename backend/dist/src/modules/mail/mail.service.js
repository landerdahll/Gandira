"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MailService_1.name);
        const host = config.get('SMTP_HOST');
        this.fromAddress = config.get('SMTP_FROM', 'noreply@outrahora.com');
        this.devMode = !host;
        if (host) {
            this.transporter = nodemailer.createTransport({
                host,
                port: config.get('SMTP_PORT', 587),
                secure: config.get('SMTP_PORT', 587) === 465,
                auth: {
                    user: config.get('SMTP_USER'),
                    pass: config.get('SMTP_PASS'),
                },
            });
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
        <!-- Header -->
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:1px solid #1a1a1a;">
            <p style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              outra<span style="color:#67bed9">hora</span>
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">Redefinição de senha</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
              Olá, ${name}. Recebemos uma solicitação para redefinir a senha da sua conta OutraHora.
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
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;">
            <p style="margin:0;font-size:12px;color:#333;text-align:center;">
              © ${new Date().getFullYear()} OutraHora — Todos os direitos reservados
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
        if (this.devMode) {
            this.logger.warn('⚠️  SMTP não configurado — link de redefinição:');
            this.logger.warn(`📧  Para: ${to}`);
            this.logger.warn(`🔗  ${resetUrl}`);
            return;
        }
        const info = await this.transporter.sendMail({
            from: `"OutraHora" <${this.fromAddress}>`,
            to,
            subject: 'Redefinição de senha — OutraHora',
            html,
        });
        this.logger.log(`Password reset email sent to ${to} — messageId: ${info.messageId}`);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map