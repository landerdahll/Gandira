import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailOutboxStatus, Prisma } from '@prisma/client';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { maskEmail } from '../../common/utils/demo-email.util';
import { MailService } from './mail.service';
import { MailTemplateName } from './mail.templates';
import { EmailTokenPurpose, EmailTokenService } from './email-token.service';
import { getPublicFrontendUrl } from '../../common/utils/public-url.util';

type Db = PrismaService | Prisma.TransactionClient;
export interface EnqueueEmail {
  type: string;
  recipient: string;
  template: MailTemplateName;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

@Injectable()
export class EmailOutboxService {
  private readonly logger = new Logger(EmailOutboxService.name);
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly tokens: EmailTokenService,
  ) {}

  async enqueue(input: EnqueueEmail, db: Db = this.prisma) {
    const subject = this.mail.render(input.template, input.payload).subject;
    return db.emailOutbox.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: {},
      create: {
        ...input,
        subject,
        payload: input.payload as Prisma.InputJsonValue,
        maxAttempts: this.maxAttempts(),
      },
    });
  }

  @Interval(Number(process.env.EMAIL_OUTBOX_POLL_INTERVAL_MS || 45_000))
  async processPending() {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.recoverStale();
      const candidates = await this.prisma.emailOutbox.findMany({
        where: { status: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' }, take: 20,
      });
      for (const item of candidates) await this.processOne(item.id);
    } finally {
      this.processing = false;
    }
  }

  private async processOne(id: string) {
    const claimed = await this.prisma.emailOutbox.updateMany({
      where: { id, status: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: new Date() } },
      data: { status: 'PROCESSING', processingAt: new Date(), attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) return;
    const item = await this.prisma.emailOutbox.findUniqueOrThrow({ where: { id } });
    try {
      const payload = this.hydratePayload(item.payload as Record<string, unknown>);
      const delivered = await this.mail.deliver(item.recipient, item.template as MailTemplateName, payload);
      await this.prisma.emailOutbox.update({ where: { id }, data: {
        status: 'SENT', sentAt: new Date(), processingAt: null, providerMessageId: delivered.providerMessageId, lastError: null,
      } });
    } catch (error) {
      const message = this.summarizeError(error);
      const failed = item.attempts >= item.maxAttempts;
      const delayMs = Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, item.attempts - 1));
      await this.prisma.emailOutbox.update({ where: { id }, data: {
        status: failed ? 'FAILED' : 'RETRY',
        lastError: message,
        processingAt: null,
        failedAt: failed ? new Date() : null,
        nextAttemptAt: failed ? item.nextAttemptAt : new Date(Date.now() + delayMs),
      } });
      this.logger.error(`Falha de e-mail tipo=${item.type} destinatário=${maskEmail(item.recipient)} tentativa=${item.attempts}`);
    }
  }

  private async recoverStale() {
    const timeout = Math.max(60_000, Number(this.config.get('EMAIL_OUTBOX_PROCESSING_TIMEOUT_MS', 10 * 60_000)));
    await this.prisma.emailOutbox.updateMany({
      where: { status: 'PROCESSING', processingAt: { lt: new Date(Date.now() - timeout) } },
      data: { status: 'RETRY', processingAt: null, nextAttemptAt: new Date(), lastError: 'Processamento interrompido; reagendado.' },
    });
  }

  async adminList(page = 1, limit = 20, status?: EmailOutboxStatus) {
    const take = Math.min(Math.max(limit, 1), 100);
    const where = status ? { status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.emailOutbox.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (Math.max(page, 1) - 1) * take, take,
        select: { id: true, type: true, recipient: true, status: true, attempts: true, maxAttempts: true, relatedEntityType: true, relatedEntityId: true, providerMessageId: true, lastError: true, createdAt: true, updatedAt: true, sentAt: true, failedAt: true } }),
      this.prisma.emailOutbox.count({ where }),
    ]);
    return { data: rows.map(row => ({ ...row, recipient: maskEmail(row.recipient) })), meta: { total, page, lastPage: Math.ceil(total / take) } };
  }

  private maxAttempts() { return Math.max(1, Number(this.config.get('EMAIL_OUTBOX_MAX_ATTEMPTS', 5))); }
  private hydratePayload(payload: Record<string, unknown>) {
    if (!payload.tokenRecordId || !payload.tokenPurpose || !payload.tokenPath) return payload;
    const token = this.tokens.reconstruct(String(payload.tokenRecordId), payload.tokenPurpose as EmailTokenPurpose);
    const parameter = String(payload.tokenParameter || 'token');
    const email = payload.tokenEmail ? `&email=${encodeURIComponent(String(payload.tokenEmail))}` : '';
    const url = `${getPublicFrontendUrl(this.config)}${payload.tokenPath}?${parameter}=${encodeURIComponent(token)}${email}`;
    return { ...payload, url, ...(payload.actionLabel ? { actionUrl: url } : {}) };
  }
  private summarizeError(error: unknown) { return String(error instanceof Error ? error.message : 'Falha desconhecida').replace(/[\r\n]+/g, ' ').slice(0, 500); }
}
