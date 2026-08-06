import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { getPublicFrontendUrl } from '../../common/utils/public-url.util';
import { MailTemplateName, renderMail } from './mail.templates';

export interface MailDelivery { providerMessageId?: string }
export interface MailAttachment { filename: string; content: Buffer; contentType: string }
export interface MailDeliveryOptions { attachments?: MailAttachment[]; idempotencyKey?: string }

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly logoUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
    const legacyFrom = config.get<string>('RESEND_FROM')?.trim();
    const fromName = config.get<string>('RESEND_FROM_NAME')?.trim() || 'Pago by OutraHora';
    const configuredEmail = config.get<string>('RESEND_FROM_EMAIL')?.trim();
    const fromEmail = configuredEmail || legacyFrom || 'onboarding@resend.dev';
    this.from = !configuredEmail && legacyFrom?.includes('<') ? legacyFrom : `${fromName} <${fromEmail}>`;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.logoUrl = `${getPublicFrontendUrl(config)}/logo-full-blue.svg`;
    if (legacyFrom && !config.get<string>('RESEND_FROM_EMAIL')) {
      this.logger.warn('RESEND_FROM é legado; migre para RESEND_FROM_EMAIL.');
    }
  }

  onModuleInit() {
    if (this.config.get<string>('NODE_ENV') === 'production' &&
        this.config.get<string>('DEMO_EMAIL_MODE', 'false').trim().toLowerCase() === 'true') {
      throw new Error('DEMO_EMAIL_MODE não pode estar habilitado em produção.');
    }
  }

  render(template: MailTemplateName, payload: Record<string, any>) {
    return renderMail(template, payload, this.logoUrl);
  }

  async deliver(to: string, template: MailTemplateName, payload: Record<string, any>, options: MailDeliveryOptions = {}): Promise<MailDelivery> {
    const rendered = this.render(template, payload);
    if (!this.resend) {
      this.logger.warn(`E-mail não enviado: RESEND_API_KEY ausente; tipo=${template}`);
      throw new Error('Provedor de e-mail não configurado');
    }
    let response;
    try {
      response = await this.resend.emails.send({
        from: this.from,
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        ...(options.attachments?.length ? { attachments: options.attachments } : {}),
      }, options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      throw new Error(`[RESEND] ${message}`);
    }
    const { data, error } = response;
    if (error) throw new Error(`[RESEND] ${error.message}`);
    return { providerMessageId: data?.id };
  }

  async sendTicketTransferEmail(to: string, subject: string, message: string, actionUrl?: string) {
    return this.deliver(to, 'TRANSFER', { subject, message, actionUrl });
  }

  async sendVerificationEmail(to: string, name: string, verifyUrl: string) {
    return this.deliver(to, 'EMAIL_VERIFICATION', { name, url: verifyUrl });
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string) {
    return this.deliver(to, 'PASSWORD_RESET', { name, url: resetUrl });
  }

  async sendOrderConfirmation(to: string, name: string, data: Record<string, any>) {
    return this.deliver(to, 'ORDER_CONFIRMATION', { ...data, name });
  }

  async sendRefundConfirmation(to: string, name: string, data: Record<string, any>) {
    return this.deliver(to, 'REFUND_CONFIRMATION', { ...data, name });
  }
}
