import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { createHash } from 'crypto';
import * as QRCode from 'qrcode';
import { generateSecureToken } from '../../common/utils/crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Interval } from '@nestjs/schedule';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { EmailOutboxService } from '../mail/email-outbox.service';
import { EmailTokenService } from '../mail/email-token.service';
import { randomUUID } from 'crypto';
import { getPublicFrontendUrl } from '../../common/utils/public-url.util';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const normalizeEmail = (value: string) => value.trim().toLowerCase();
type InviteRecipient = Pick<User, 'id' | 'email' | 'name'>;

@Injectable()
export class TicketTransfersService {
  private readonly logger = new Logger(TicketTransfersService.name);
  constructor(private prismaService: PrismaService, private mail: MailService, private config: ConfigService, private outbox?: EmailOutboxService, private emailTokens?: EmailTokenService) {}
  private get prisma() { return this.prismaService; }
  private get tokenService() { return this.emailTokens ?? new EmailTokenService(this.config); }
  private get queue(): Pick<EmailOutboxService, 'enqueue'> {
    return this.outbox ?? { enqueue: async (input: any) => this.mail.sendTicketTransferEmail(input.recipient, input.payload.subject, input.payload.message, input.payload.actionUrl) as any };
  }

  hashInviteToken(rawToken: string) { return digest(rawToken); }

  async request(ticketId: string, senderUserId: string, rawEmail: string) {
    const recipientEmail = normalizeEmail(rawEmail);
    const transferId = randomUUID();
    const invitationToken = this.tokenService.reconstruct(transferId, 'transfer-invite');
    const nextToken = generateSecureToken(32);
    const qrCodeUrl = await QRCode.toDataURL(nextToken, { errorCorrectionLevel: 'H', width: 400, margin: 2 });

    const result = await withSerializableRetry(() => this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { event: true, checkIn: true, order: { include: { user: true } }, batch: true, owner: true, clubBenefitUsage: true },
      });
      if (!ticket) throw new NotFoundException('Ingresso não encontrado');
      if (ticket.ownerUserId !== senderUserId) throw new ForbiddenException('Somente o titular atual pode transferir este ingresso');
      if (normalizeEmail(ticket.owner.email) === recipientEmail) throw new BadRequestException('Não é possível transferir para o próprio e-mail');
      if (!ticket.event.allowTicketTransfers) throw new BadRequestException('Este evento não permite transferências');
      if (ticket.event.startDate <= new Date()) throw new BadRequestException('O evento já começou');
      if (ticket.status === 'TRANSFER_PENDING') throw new ConflictException('O ingresso já possui uma transferência em andamento');
      if (ticket.status !== 'ACTIVE' || ticket.checkIn) throw new BadRequestException('Este ingresso não está disponível para transferência');
      if (ticket.order.status !== 'PAID') throw new BadRequestException('O pedido deste ingresso não está ativo');
      if (ticket.clubBenefitUsage) {
        throw new BadRequestException('Este ingresso recebeu o benefício do Clube Outrahora e não pode ser transferido');
      }

      const recipient = await tx.user.findUnique({ where: { email: recipientEmail }, select: { id: true, name: true, email: true, isActive: true } });
      if (recipient && !recipient.isActive) throw new BadRequestException('Não foi possível transferir para este destinatário');
      const reserved = await tx.ticket.updateMany({ where: { id: ticketId, ownerUserId: senderUserId, status: 'ACTIVE' }, data: { status: 'TRANSFER_PENDING', qrCodeUrl: null } });
      if (reserved.count !== 1) throw new ConflictException('O ingresso foi alterado por outra operação. Tente novamente.');

      const common = { ticketId, eventId: ticket.eventId, senderUserId, recipientEmail, previousQrIdentifier: digest(ticket.token) };
      const created = await tx.ticketTransfer.create({ data: recipient ? {
        id: transferId, ...common, recipientUserId: recipient.id, status: 'COMPLETED', completedAt: new Date(),
      } : {
        id: transferId, ...common, status: 'PENDING_REGISTRATION', invitationTokenHash: digest(invitationToken), expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      } });
      await tx.ticketHistory.create({ data: { ticketId, transferId: created.id, action: 'TRANSFER_REQUESTED', actorUserId: senderUserId, metadata: { recipientEmail } } });

      if (recipient) {
        const completed = await tx.ticket.updateMany({
          where: { id: ticketId, ownerUserId: senderUserId, status: 'TRANSFER_PENDING' },
          data: { ownerUserId: recipient.id, holderName: recipient.name, holderEmail: recipient.email, token: nextToken, qrCodeUrl, status: 'ACTIVE' },
        });
        if (completed.count !== 1) throw new ConflictException('O ingresso foi alterado por outra operação. Tente novamente.');
        await tx.ticketTransfer.update({ where: { id: created.id }, data: { newQrIdentifier: digest(nextToken) } });
        await tx.ticketHistory.createMany({ data: [
          { ticketId, transferId: created.id, action: 'QR_INVALIDATED', actorUserId: senderUserId },
          { ticketId, transferId: created.id, action: 'QR_REGENERATED', actorUserId: senderUserId },
          { ticketId, transferId: created.id, action: 'TRANSFER_COMPLETED', actorUserId: senderUserId, metadata: { recipientUserId: recipient.id } },
        ] });
      } else {
        await tx.ticketHistory.create({ data: { ticketId, transferId: created.id, action: 'TRANSFER_INVITATION_SENT', actorUserId: senderUserId } });
      }
      await this.enqueueRequestedEmails(tx, created, { ticket, recipient });
      return { transfer: created, notification: { ticket, recipient, invitationToken } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    return { id: result.transfer.id, status: result.transfer.status, recipientEmail: result.transfer.recipientEmail, expiresAt: result.transfer.expiresAt };
  }

  async inspectInvite(rawToken: string, email: string) {
    const transfer = await this.prisma.ticketTransfer.findUnique({ where: { invitationTokenHash: digest(rawToken) } });
    if (transfer?.status === 'PENDING_REGISTRATION' && transfer.expiresAt && transfer.expiresAt <= new Date()) await this.expire(transfer.id);
    if (!transfer || transfer.status !== 'PENDING_REGISTRATION' || !transfer.expiresAt || transfer.expiresAt <= new Date()) throw new BadRequestException('Convite inválido ou expirado');
    if (transfer.recipientEmail !== normalizeEmail(email)) throw new BadRequestException('O e-mail deve ser o mesmo do convite');
    return transfer;
  }

  async prepareInviteCompletion(rawToken: string, email: string) {
    await this.inspectInvite(rawToken, email);
    return { validated: true };
  }

  async linkInviteToUnverifiedUserInTransaction(tx: Prisma.TransactionClient, rawToken: string, user: InviteRecipient) {
    const hash = digest(rawToken), now = new Date();
    const transfer = await tx.ticketTransfer.findUnique({ where: { invitationTokenHash: hash } });
    if (!transfer || transfer.status !== 'PENDING_REGISTRATION' || !transfer.expiresAt || transfer.expiresAt <= now || normalizeEmail(transfer.recipientEmail) !== normalizeEmail(user.email)) {
      throw new BadRequestException('Convite inválido ou expirado');
    }
    const changed = await tx.ticketTransfer.updateMany({ where: { id: transfer.id, status: 'PENDING_REGISTRATION', invitationTokenHash: hash, expiresAt: { gt: now } }, data: { status: 'PENDING_EMAIL_VERIFICATION', recipientUserId: user.id } });
    if (changed.count !== 1) throw new ConflictException('Este convite já foi processado');
    await tx.ticketHistory.create({ data: { ticketId: transfer.ticketId, transferId: transfer.id, action: 'REGISTRATION_COMPLETED', actorUserId: user.id } });
  }

  async completePendingVerificationForUserInTransaction(tx: Prisma.TransactionClient, user: InviteRecipient) {
    const transfers = await tx.ticketTransfer.findMany({ where: { recipientUserId: user.id, recipientEmail: normalizeEmail(user.email), status: 'PENDING_EMAIL_VERIFICATION', expiresAt: { gt: new Date() } }, include: { sender: true, event: true } });
    let completed = 0;
    for (const transfer of transfers) {
      const nextToken = generateSecureToken(32);
      const qrCodeUrl = await QRCode.toDataURL(nextToken, { errorCorrectionLevel: 'H', width: 400, margin: 2 });
      const changed = await tx.ticketTransfer.updateMany({ where: { id: transfer.id, status: 'PENDING_EMAIL_VERIFICATION', recipientUserId: user.id, expiresAt: { gt: new Date() } }, data: { status: 'COMPLETED', completedAt: new Date(), invitationTokenHash: null, newQrIdentifier: digest(nextToken) } });
      if (changed.count !== 1) continue;
      const claimed = await tx.ticket.updateMany({ where: { id: transfer.ticketId, ownerUserId: transfer.senderUserId, status: 'TRANSFER_PENDING' }, data: { ownerUserId: user.id, holderName: user.name, holderEmail: user.email, token: nextToken, qrCodeUrl, status: 'ACTIVE' } });
      if (claimed.count !== 1) throw new ConflictException('O ingresso foi alterado por outra operação');
      await tx.ticketHistory.createMany({ data: [
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'EMAIL_VERIFIED', actorUserId: user.id },
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'QR_INVALIDATED', actorUserId: user.id },
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'QR_REGENERATED', actorUserId: user.id },
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'TRANSFER_COMPLETED', actorUserId: user.id },
      ] });
      await this.enqueueCompletedEmails(tx, transfer, user);
      completed += 1;
    }
    return completed;
  }

  async completeInviteInTransaction(
    tx: Prisma.TransactionClient,
    rawToken: string,
    user: InviteRecipient,
    prepared: { nextToken: string; qrCodeUrl: string },
  ) {
      const normalizedUserEmail = normalizeEmail(user.email);
      const transfer = await tx.ticketTransfer.findUnique({ where: { invitationTokenHash: digest(rawToken) }, include: { ticket: true, sender: true, event: true } });
      const now = new Date();
      if (!transfer || transfer.status !== 'PENDING_REGISTRATION' || !transfer.expiresAt || transfer.expiresAt <= now) {
        throw new BadRequestException('Convite inválido ou expirado');
      }
      if (normalizeEmail(transfer.recipientEmail) !== normalizedUserEmail) throw new BadRequestException('O e-mail deve ser o mesmo do convite');
      const updated = await tx.ticketTransfer.updateMany({
        where: { id: transfer.id, status: 'PENDING_REGISTRATION', invitationTokenHash: digest(rawToken), expiresAt: { gt: now } },
        data: { status: 'COMPLETED', recipientUserId: user.id, completedAt: now, invitationTokenHash: null, newQrIdentifier: digest(prepared.nextToken) },
      });
      if (updated.count !== 1) throw new ConflictException('Este convite já foi processado');
      const claimedTicket = await tx.ticket.updateMany({
        where: { id: transfer.ticketId, status: 'TRANSFER_PENDING', ownerUserId: transfer.senderUserId },
        data: { ownerUserId: user.id, holderName: user.name, holderEmail: user.email, token: prepared.nextToken, qrCodeUrl: prepared.qrCodeUrl, status: 'ACTIVE' },
      });
      if (claimedTicket.count !== 1) throw new ConflictException('O ingresso foi alterado por outra operação');
      await tx.ticketHistory.createMany({ data: [
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'REGISTRATION_COMPLETED', actorUserId: user.id },
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'QR_INVALIDATED', actorUserId: user.id },
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'QR_REGENERATED', actorUserId: user.id },
        { ticketId: transfer.ticketId, transferId: transfer.id, action: 'TRANSFER_COMPLETED', actorUserId: user.id },
      ] });
      return { transfer, user };
  }

  async cancel(id: string, senderUserId: string) {
    const nextToken = generateSecureToken(32);
    const qrCodeUrl = await QRCode.toDataURL(nextToken, { errorCorrectionLevel: 'H', width: 400, margin: 2 });
    const result = await withSerializableRetry(() => this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transfer = await tx.ticketTransfer.findUnique({ where: { id }, include: { ticket: true, event: true, sender: true } });
      if (!transfer) throw new NotFoundException('Transferência não encontrada');
      if (transfer.senderUserId !== senderUserId) throw new ForbiddenException('Acesso negado');
      if (!['PENDING_REGISTRATION', 'PENDING_EMAIL_VERIFICATION'].includes(transfer.status)) throw new BadRequestException('Somente transferências pendentes podem ser canceladas');
      const changed = await tx.ticketTransfer.updateMany({ where: { id, status: { in: ['PENDING_REGISTRATION', 'PENDING_EMAIL_VERIFICATION'] } }, data: { status: 'CANCELLED', cancelledAt: new Date(), invitationTokenHash: null, cancellationReason: 'Cancelada pelo remetente', newQrIdentifier: digest(nextToken) } });
      if (!changed.count) throw new ConflictException('A transferência já foi processada');
      const restored = await tx.ticket.updateMany({
        where: { id: transfer.ticketId, ownerUserId: senderUserId, status: 'TRANSFER_PENDING' },
        data: { status: 'ACTIVE', token: nextToken, qrCodeUrl },
      });
      if (restored.count !== 1) throw new ConflictException('O ingresso foi alterado por outra operação');
      await tx.ticketHistory.createMany({ data: [
        { ticketId: transfer.ticketId, transferId: id, action: 'TRANSFER_CANCELLED', actorUserId: senderUserId },
        { ticketId: transfer.ticketId, transferId: id, action: 'QR_REGENERATED', actorUserId: senderUserId },
      ] });
      await this.queue.enqueue({ type: 'TRANSFER_CANCELLED', recipient: transfer.recipientEmail, template: 'TRANSFER', payload: { subject: 'Transferência de ingresso cancelada', message: 'A transferência pendente foi cancelada pelo titular.' }, idempotencyKey: `TRANSFER_CANCELLED:${id}:RECIPIENT`, relatedEntityType: 'TicketTransfer', relatedEntityId: id }, tx);
      return transfer;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    return { status: 'CANCELLED' };
  }

  @Interval(15 * 60 * 1000)
  async expirePendingInvites() {
    const expired = await this.prisma.ticketTransfer.findMany({ where: { status: { in: ['PENDING_REGISTRATION', 'PENDING_EMAIL_VERIFICATION'] }, expiresAt: { lte: new Date() } }, select: { id: true } });
    for (const item of expired) await this.expire(item.id).catch(e => this.logger.error(`Falha ao expirar ${item.id}: ${e.message}`));
  }

  private async expire(id: string) {
    const token = generateSecureToken(32);
    const qrCodeUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'H', width: 400, margin: 2 });
    return withSerializableRetry(() => this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transfer = await tx.ticketTransfer.findUnique({ where: { id } });
      if (!transfer || !['PENDING_REGISTRATION', 'PENDING_EMAIL_VERIFICATION'].includes(transfer.status)) return;
      const changed = await tx.ticketTransfer.updateMany({ where: { id, status: { in: ['PENDING_REGISTRATION', 'PENDING_EMAIL_VERIFICATION'] } }, data: { status: 'EXPIRED', invitationTokenHash: null, cancellationReason: 'Convite expirado', newQrIdentifier: digest(token) } });
      if (!changed.count) return;
      const restored = await tx.ticket.updateMany({
        where: { id: transfer.ticketId, ownerUserId: transfer.senderUserId, status: 'TRANSFER_PENDING' },
        data: { status: 'ACTIVE', token, qrCodeUrl },
      });
      if (restored.count !== 1) throw new ConflictException('O ingresso foi alterado por outra operação');
      await tx.ticketHistory.createMany({ data: [{ ticketId: transfer.ticketId, transferId: id, action: 'TRANSFER_EXPIRED' }, { ticketId: transfer.ticketId, transferId: id, action: 'QR_REGENERATED' }] });
      await this.queue.enqueue({ type: 'TRANSFER_EXPIRED', recipient: transfer.recipientEmail, template: 'TRANSFER', payload: { subject: 'Convite de ingresso expirado', message: 'O convite expirou e o ingresso foi devolvido ao titular.' }, idempotencyKey: `TRANSFER_EXPIRED:${id}:RECIPIENT`, relatedEntityType: 'TicketTransfer', relatedEntityId: id }, tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  async ticketStatus(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, OR: [{ ownerUserId: userId }, { transfers: { some: { senderUserId: userId } } }] }, select: { id: true } });
    if (!ticket) throw new NotFoundException('Ingresso não encontrado');
    return this.prisma.ticketTransfer.findFirst({ where: { ticketId }, orderBy: { requestedAt: 'desc' }, include: { sender: { select: { name: true } }, recipient: { select: { name: true } } } });
  }
  mine(userId: string) { return this.prisma.ticketTransfer.findMany({ where: { OR: [{ senderUserId: userId }, { recipientUserId: userId }] }, orderBy: { requestedAt: 'desc' }, include: { event: { select: { title: true } }, ticket: { select: { id: true } }, sender: { select: { name: true } }, recipient: { select: { name: true } } } }); }

  async adminList(query: any) {
    const take = Math.min(Math.max(query.limit || 20, 1), 100), page = Math.max(query.page || 1, 1);
    const where: any = {
      ...(query.eventId && { eventId: query.eventId }), ...(query.status && { status: query.status }),
      ...(query.email && { recipientEmail: { contains: query.email, mode: 'insensitive' } }),
      ...(query.sender && { sender: { name: { contains: query.sender, mode: 'insensitive' } } }),
      ...(query.recipient && { recipient: { name: { contains: query.recipient, mode: 'insensitive' } } }),
      ...(query.ticketCode && { ticket: { id: { contains: query.ticketCode, mode: 'insensitive' } } }),
      ...((query.from || query.to) && { requestedAt: { ...(query.from && { gte: new Date(query.from) }), ...(query.to && { lte: new Date(query.to) }) } }),
    };
    const include = { event: { select: { title: true } }, ticket: { include: { batch: { select: { name: true } }, order: { include: { user: { select: { name: true, email: true } } } }, owner: { select: { name: true, email: true } }, checkIn: true } }, sender: { select: { name: true, email: true } }, recipient: { select: { name: true, email: true } } } as const;
    const [data, total] = await Promise.all([this.prisma.ticketTransfer.findMany({ where, include, orderBy: { requestedAt: 'desc' }, skip: (page - 1) * take, take }), this.prisma.ticketTransfer.count({ where })]);
    return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
  }
  async adminDetail(id: string) {
    const transfer = await this.prisma.ticketTransfer.findUnique({ where: { id }, include: { event: true, sender: { select: { name: true, email: true } }, recipient: { select: { name: true, email: true } }, ticket: { include: { batch: true, order: { include: { user: { select: { name: true, email: true } } } }, owner: { select: { name: true, email: true } }, checkIn: true } }, history: { orderBy: { createdAt: 'asc' } } } });
    if (!transfer) throw new NotFoundException('Transferência não encontrada');
    return transfer;
  }

  private async enqueueRequestedEmails(tx: Prisma.TransactionClient, transfer: any, n: any) {
    const base = getPublicFrontendUrl(this.config);
    if (n.recipient) {
      await this.queue.enqueue({ type: 'TRANSFER_COMPLETED_SENDER', recipient: n.ticket.owner.email, template: 'TRANSFER', payload: { subject: 'Seu ingresso foi transferido', message: `${n.ticket.event.title} foi transferido para ${n.recipient.name}. O QR Code anterior não é mais válido.` }, idempotencyKey: `TRANSFER_COMPLETED_SENDER:${transfer.id}`, relatedEntityType: 'TicketTransfer', relatedEntityId: transfer.id }, tx);
      await this.queue.enqueue({ type: 'TRANSFER_COMPLETED_RECIPIENT', recipient: n.recipient.email, template: 'TRANSFER', payload: { subject: 'Você recebeu um ingresso no Pago', message: `${n.ticket.owner.name} transferiu um ingresso de ${n.ticket.event.title} para você.`, actionUrl: `${base}/my-tickets` }, idempotencyKey: `TRANSFER_COMPLETED_RECIPIENT:${transfer.id}`, relatedEntityType: 'TicketTransfer', relatedEntityId: transfer.id }, tx);
      return;
    }
    await this.queue.enqueue({ type: 'TRANSFER_PENDING_SENDER', recipient: n.ticket.owner.email, template: 'TRANSFER', payload: { subject: 'Transferência aguardando cadastro', message: `O convite foi enviado para ${transfer.recipientEmail}.` }, idempotencyKey: `TRANSFER_PENDING_SENDER:${transfer.id}`, relatedEntityType: 'TicketTransfer', relatedEntityId: transfer.id }, tx);
    await this.queue.enqueue({ type: 'TRANSFER_INVITE', recipient: transfer.recipientEmail, template: 'TRANSFER', payload: { subject: 'Você recebeu um ingresso — crie sua conta no Pago', message: `${n.ticket.owner.name} enviou um ingresso de ${n.ticket.event.title}. Cadastre-se em até 7 dias para recebê-lo.`, actionLabel: 'Criar conta no Pago', tokenRecordId: transfer.id, tokenPurpose: 'transfer-invite', tokenPath: '/auth/register', tokenParameter: 'transferInvite', tokenEmail: transfer.recipientEmail }, idempotencyKey: `TRANSFER_INVITE:${transfer.id}`, relatedEntityType: 'TicketTransfer', relatedEntityId: transfer.id }, tx);
  }

  private async enqueueCompletedEmails(tx: Prisma.TransactionClient, transfer: any, user: InviteRecipient) {
    const base = getPublicFrontendUrl(this.config);
    await this.queue.enqueue({ type: 'TRANSFER_COMPLETED_SENDER', recipient: transfer.sender.email, template: 'TRANSFER', payload: { subject: 'Seu ingresso foi transferido', message: `${transfer.event.title} foi transferido para ${user.name}. O QR Code anterior não é mais válido.` }, idempotencyKey: `TRANSFER_COMPLETED_SENDER:${transfer.id}`, relatedEntityType: 'TicketTransfer', relatedEntityId: transfer.id }, tx);
    await this.queue.enqueue({ type: 'TRANSFER_COMPLETED_RECIPIENT', recipient: user.email, template: 'TRANSFER', payload: { subject: 'Você recebeu um ingresso no Pago', message: `${transfer.sender.name} transferiu um ingresso de ${transfer.event.title} para você.`, actionUrl: `${base}/my-tickets` }, idempotencyKey: `TRANSFER_COMPLETED_RECIPIENT:${transfer.id}`, relatedEntityType: 'TicketTransfer', relatedEntityId: transfer.id }, tx);
  }

}
