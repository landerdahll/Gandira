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
var TicketTransfersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketTransfersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const QRCode = __importStar(require("qrcode"));
const crypto_util_1 = require("../../common/utils/crypto.util");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const schedule_1 = require("@nestjs/schedule");
const serializable_retry_util_1 = require("../../common/utils/serializable-retry.util");
const demo_email_util_1 = require("../../common/utils/demo-email.util");
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const digest = (value) => (0, crypto_1.createHash)('sha256').update(value).digest('hex');
const normalizeEmail = (value) => value.trim().toLowerCase();
let TicketTransfersService = TicketTransfersService_1 = class TicketTransfersService {
    constructor(prismaService, mail, config) {
        this.prismaService = prismaService;
        this.mail = mail;
        this.config = config;
        this.logger = new common_1.Logger(TicketTransfersService_1.name);
    }
    get prisma() { return this.prismaService; }
    hashInviteToken(rawToken) { return digest(rawToken); }
    async request(ticketId, senderUserId, rawEmail) {
        const recipientEmail = normalizeEmail(rawEmail);
        const invitationToken = (0, crypto_util_1.generateSecureToken)(32);
        const nextToken = (0, crypto_util_1.generateSecureToken)(32);
        const qrCodeUrl = await QRCode.toDataURL(nextToken, { errorCorrectionLevel: 'H', width: 400, margin: 2 });
        const result = await (0, serializable_retry_util_1.withSerializableRetry)(() => this.prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findUnique({
                where: { id: ticketId },
                include: { event: true, checkIn: true, order: { include: { user: true } }, batch: true, owner: true, clubBenefitUsage: true },
            });
            if (!ticket)
                throw new common_1.NotFoundException('Ingresso não encontrado');
            if (ticket.ownerUserId !== senderUserId)
                throw new common_1.ForbiddenException('Somente o titular atual pode transferir este ingresso');
            if (normalizeEmail(ticket.owner.email) === recipientEmail)
                throw new common_1.BadRequestException('Não é possível transferir para o próprio e-mail');
            if (!ticket.event.allowTicketTransfers)
                throw new common_1.BadRequestException('Este evento não permite transferências');
            if (ticket.event.startDate <= new Date())
                throw new common_1.BadRequestException('O evento já começou');
            if (ticket.status === 'TRANSFER_PENDING')
                throw new common_1.ConflictException('O ingresso já possui uma transferência em andamento');
            if (ticket.status !== 'ACTIVE' || ticket.checkIn)
                throw new common_1.BadRequestException('Este ingresso não está disponível para transferência');
            if (ticket.order.status !== 'PAID')
                throw new common_1.BadRequestException('O pedido deste ingresso não está ativo');
            if (ticket.clubBenefitUsage) {
                throw new common_1.BadRequestException('Este ingresso recebeu o benefício do Clube Outrahora e não pode ser transferido');
            }
            const recipient = await tx.user.findUnique({ where: { email: recipientEmail }, select: { id: true, name: true, email: true, isActive: true } });
            if (recipient && !recipient.isActive)
                throw new common_1.BadRequestException('Não foi possível transferir para este destinatário');
            const reserved = await tx.ticket.updateMany({ where: { id: ticketId, ownerUserId: senderUserId, status: 'ACTIVE' }, data: { status: 'TRANSFER_PENDING', qrCodeUrl: null } });
            if (reserved.count !== 1)
                throw new common_1.ConflictException('O ingresso foi alterado por outra operação. Tente novamente.');
            const common = { ticketId, eventId: ticket.eventId, senderUserId, recipientEmail, previousQrIdentifier: digest(ticket.token) };
            const created = await tx.ticketTransfer.create({ data: recipient ? {
                    ...common, recipientUserId: recipient.id, status: 'COMPLETED', completedAt: new Date(),
                } : {
                    ...common, status: 'PENDING_REGISTRATION', invitationTokenHash: digest(invitationToken), expiresAt: new Date(Date.now() + INVITE_TTL_MS),
                } });
            await tx.ticketHistory.create({ data: { ticketId, transferId: created.id, action: 'TRANSFER_REQUESTED', actorUserId: senderUserId, metadata: { recipientEmail } } });
            if (recipient) {
                const completed = await tx.ticket.updateMany({
                    where: { id: ticketId, ownerUserId: senderUserId, status: 'TRANSFER_PENDING' },
                    data: { ownerUserId: recipient.id, holderName: recipient.name, holderEmail: recipient.email, token: nextToken, qrCodeUrl, status: 'ACTIVE' },
                });
                if (completed.count !== 1)
                    throw new common_1.ConflictException('O ingresso foi alterado por outra operação. Tente novamente.');
                await tx.ticketTransfer.update({ where: { id: created.id }, data: { newQrIdentifier: digest(nextToken) } });
                await tx.ticketHistory.createMany({ data: [
                        { ticketId, transferId: created.id, action: 'QR_INVALIDATED', actorUserId: senderUserId },
                        { ticketId, transferId: created.id, action: 'QR_REGENERATED', actorUserId: senderUserId },
                        { ticketId, transferId: created.id, action: 'TRANSFER_COMPLETED', actorUserId: senderUserId, metadata: { recipientUserId: recipient.id } },
                    ] });
            }
            else {
                await tx.ticketHistory.create({ data: { ticketId, transferId: created.id, action: 'TRANSFER_INVITATION_SENT', actorUserId: senderUserId } });
            }
            return { transfer: created, notification: { ticket, recipient, invitationToken } };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
        this.sendRequestedEmails(result.transfer, result.notification).catch(e => this.logger.error(`Falha nas notificações da transferência ${result.transfer.id}: ${e.message}`));
        return { id: result.transfer.id, status: result.transfer.status, recipientEmail: result.transfer.recipientEmail, expiresAt: result.transfer.expiresAt };
    }
    async inspectInvite(rawToken, email) {
        const transfer = await this.prisma.ticketTransfer.findUnique({ where: { invitationTokenHash: digest(rawToken) } });
        if (transfer?.status === 'PENDING_REGISTRATION' && transfer.expiresAt && transfer.expiresAt <= new Date())
            await this.expire(transfer.id);
        if (!transfer || transfer.status !== 'PENDING_REGISTRATION' || !transfer.expiresAt || transfer.expiresAt <= new Date())
            throw new common_1.BadRequestException('Convite inválido ou expirado');
        if (transfer.recipientEmail !== normalizeEmail(email))
            throw new common_1.BadRequestException('O e-mail deve ser o mesmo do convite');
        return transfer;
    }
    async prepareInviteCompletion(rawToken, email) {
        await this.inspectInvite(rawToken, email);
        const nextToken = (0, crypto_util_1.generateSecureToken)(32);
        const qrCodeUrl = await QRCode.toDataURL(nextToken, { errorCorrectionLevel: 'H', width: 400, margin: 2 });
        return { nextToken, qrCodeUrl };
    }
    async completeInviteInTransaction(tx, rawToken, user, prepared) {
        const normalizedUserEmail = normalizeEmail(user.email);
        const transfer = await tx.ticketTransfer.findUnique({ where: { invitationTokenHash: digest(rawToken) }, include: { ticket: true, sender: true, event: true } });
        const now = new Date();
        if (!transfer || transfer.status !== 'PENDING_REGISTRATION' || !transfer.expiresAt || transfer.expiresAt <= now) {
            throw new common_1.BadRequestException('Convite inválido ou expirado');
        }
        if (normalizeEmail(transfer.recipientEmail) !== normalizedUserEmail)
            throw new common_1.BadRequestException('O e-mail deve ser o mesmo do convite');
        const updated = await tx.ticketTransfer.updateMany({
            where: { id: transfer.id, status: 'PENDING_REGISTRATION', invitationTokenHash: digest(rawToken), expiresAt: { gt: now } },
            data: { status: 'COMPLETED', recipientUserId: user.id, completedAt: now, invitationTokenHash: null, newQrIdentifier: digest(prepared.nextToken) },
        });
        if (updated.count !== 1)
            throw new common_1.ConflictException('Este convite já foi processado');
        const claimedTicket = await tx.ticket.updateMany({
            where: { id: transfer.ticketId, status: 'TRANSFER_PENDING', ownerUserId: transfer.senderUserId },
            data: { ownerUserId: user.id, holderName: user.name, holderEmail: user.email, token: prepared.nextToken, qrCodeUrl: prepared.qrCodeUrl, status: 'ACTIVE' },
        });
        if (claimedTicket.count !== 1)
            throw new common_1.ConflictException('O ingresso foi alterado por outra operação');
        await tx.ticketHistory.createMany({ data: [
                { ticketId: transfer.ticketId, transferId: transfer.id, action: 'REGISTRATION_COMPLETED', actorUserId: user.id },
                { ticketId: transfer.ticketId, transferId: transfer.id, action: 'QR_INVALIDATED', actorUserId: user.id },
                { ticketId: transfer.ticketId, transferId: transfer.id, action: 'QR_REGENERATED', actorUserId: user.id },
                { ticketId: transfer.ticketId, transferId: transfer.id, action: 'TRANSFER_COMPLETED', actorUserId: user.id },
            ] });
        return { transfer, user };
    }
    notifyInviteCompleted(transfer, user) {
        this.sendCompletedEmails(transfer, user).catch(e => this.logger.error(e.message));
    }
    async cancel(id, senderUserId) {
        const nextToken = (0, crypto_util_1.generateSecureToken)(32);
        const qrCodeUrl = await QRCode.toDataURL(nextToken, { errorCorrectionLevel: 'H', width: 400, margin: 2 });
        const result = await (0, serializable_retry_util_1.withSerializableRetry)(() => this.prisma.$transaction(async (tx) => {
            const transfer = await tx.ticketTransfer.findUnique({ where: { id }, include: { ticket: true, event: true, sender: true } });
            if (!transfer)
                throw new common_1.NotFoundException('Transferência não encontrada');
            if (transfer.senderUserId !== senderUserId)
                throw new common_1.ForbiddenException('Acesso negado');
            if (transfer.status !== 'PENDING_REGISTRATION')
                throw new common_1.BadRequestException('Somente transferências pendentes podem ser canceladas');
            const changed = await tx.ticketTransfer.updateMany({ where: { id, status: 'PENDING_REGISTRATION' }, data: { status: 'CANCELLED', cancelledAt: new Date(), invitationTokenHash: null, cancellationReason: 'Cancelada pelo remetente', newQrIdentifier: digest(nextToken) } });
            if (!changed.count)
                throw new common_1.ConflictException('A transferência já foi processada');
            const restored = await tx.ticket.updateMany({
                where: { id: transfer.ticketId, ownerUserId: senderUserId, status: 'TRANSFER_PENDING' },
                data: { status: 'ACTIVE', token: nextToken, qrCodeUrl },
            });
            if (restored.count !== 1)
                throw new common_1.ConflictException('O ingresso foi alterado por outra operação');
            await tx.ticketHistory.createMany({ data: [
                    { ticketId: transfer.ticketId, transferId: id, action: 'TRANSFER_CANCELLED', actorUserId: senderUserId },
                    { ticketId: transfer.ticketId, transferId: id, action: 'QR_REGENERATED', actorUserId: senderUserId },
                ] });
            return transfer;
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
        this.mail.sendTicketTransferEmail(result.recipientEmail, 'Transferência de ingresso cancelada', 'A transferência pendente foi cancelada pelo titular.').catch(() => undefined);
        return { status: 'CANCELLED' };
    }
    async expirePendingInvites() {
        const expired = await this.prisma.ticketTransfer.findMany({ where: { status: 'PENDING_REGISTRATION', expiresAt: { lte: new Date() } }, select: { id: true } });
        for (const item of expired)
            await this.expire(item.id).catch(e => this.logger.error(`Falha ao expirar ${item.id}: ${e.message}`));
    }
    async expire(id) {
        const token = (0, crypto_util_1.generateSecureToken)(32);
        const qrCodeUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'H', width: 400, margin: 2 });
        return (0, serializable_retry_util_1.withSerializableRetry)(() => this.prisma.$transaction(async (tx) => {
            const transfer = await tx.ticketTransfer.findUnique({ where: { id } });
            if (!transfer || transfer.status !== 'PENDING_REGISTRATION')
                return;
            const changed = await tx.ticketTransfer.updateMany({ where: { id, status: 'PENDING_REGISTRATION' }, data: { status: 'EXPIRED', invitationTokenHash: null, cancellationReason: 'Convite expirado', newQrIdentifier: digest(token) } });
            if (!changed.count)
                return;
            const restored = await tx.ticket.updateMany({
                where: { id: transfer.ticketId, ownerUserId: transfer.senderUserId, status: 'TRANSFER_PENDING' },
                data: { status: 'ACTIVE', token, qrCodeUrl },
            });
            if (restored.count !== 1)
                throw new common_1.ConflictException('O ingresso foi alterado por outra operação');
            await tx.ticketHistory.createMany({ data: [{ ticketId: transfer.ticketId, transferId: id, action: 'TRANSFER_EXPIRED' }, { ticketId: transfer.ticketId, transferId: id, action: 'QR_REGENERATED' }] });
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
    }
    async ticketStatus(ticketId, userId) {
        const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, OR: [{ ownerUserId: userId }, { transfers: { some: { senderUserId: userId } } }] }, select: { id: true } });
        if (!ticket)
            throw new common_1.NotFoundException('Ingresso não encontrado');
        return this.prisma.ticketTransfer.findFirst({ where: { ticketId }, orderBy: { requestedAt: 'desc' }, include: { sender: { select: { name: true } }, recipient: { select: { name: true } } } });
    }
    mine(userId) { return this.prisma.ticketTransfer.findMany({ where: { OR: [{ senderUserId: userId }, { recipientUserId: userId }] }, orderBy: { requestedAt: 'desc' }, include: { event: { select: { title: true } }, ticket: { select: { id: true } }, sender: { select: { name: true } }, recipient: { select: { name: true } } } }); }
    async adminList(query) {
        const take = Math.min(Math.max(query.limit || 20, 1), 100), page = Math.max(query.page || 1, 1);
        const where = {
            ...(query.eventId && { eventId: query.eventId }), ...(query.status && { status: query.status }),
            ...(query.email && { recipientEmail: { contains: query.email, mode: 'insensitive' } }),
            ...(query.sender && { sender: { name: { contains: query.sender, mode: 'insensitive' } } }),
            ...(query.recipient && { recipient: { name: { contains: query.recipient, mode: 'insensitive' } } }),
            ...(query.ticketCode && { ticket: { id: { contains: query.ticketCode, mode: 'insensitive' } } }),
            ...((query.from || query.to) && { requestedAt: { ...(query.from && { gte: new Date(query.from) }), ...(query.to && { lte: new Date(query.to) }) } }),
        };
        const include = { event: { select: { title: true } }, ticket: { include: { batch: { select: { name: true } }, order: { include: { user: { select: { name: true, email: true } } } }, owner: { select: { name: true, email: true } }, checkIn: true } }, sender: { select: { name: true, email: true } }, recipient: { select: { name: true, email: true } } };
        const [data, total] = await Promise.all([this.prisma.ticketTransfer.findMany({ where, include, orderBy: { requestedAt: 'desc' }, skip: (page - 1) * take, take }), this.prisma.ticketTransfer.count({ where })]);
        return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
    }
    async adminDetail(id) {
        const transfer = await this.prisma.ticketTransfer.findUnique({ where: { id }, include: { event: true, sender: { select: { name: true, email: true } }, recipient: { select: { name: true, email: true } }, ticket: { include: { batch: true, order: { include: { user: { select: { name: true, email: true } } } }, owner: { select: { name: true, email: true } }, checkIn: true } }, history: { orderBy: { createdAt: 'asc' } } } });
        if (!transfer)
            throw new common_1.NotFoundException('Transferência não encontrada');
        return transfer;
    }
    async sendRequestedEmails(transfer, n) {
        const base = (this.config.get('FRONTEND_URL', 'http://localhost:3000')).split(',')[0].trim();
        if (n.recipient) {
            await Promise.all([
                this.mail.sendTicketTransferEmail(n.ticket.owner.email, 'Seu ingresso foi transferido', `${n.ticket.event.title} foi transferido para ${n.recipient.name}. O QR Code anterior não é mais válido.`),
                this.mail.sendTicketTransferEmail(n.recipient.email, 'Você recebeu um ingresso no Pago', `${n.ticket.owner.name} transferiu um ingresso de ${n.ticket.event.title} para você.`, `${base}/my-tickets`),
            ]);
        }
        else {
            const inviteUrl = `${base}/auth/register?transferInvite=${n.invitationToken}&email=${encodeURIComponent(transfer.recipientEmail)}`;
            if ((0, demo_email_util_1.isDemoEmailMode)(this.config)) {
                this.logger.log(`[DEMO EMAIL MODE] Convite de transferência\nDestinatário: ${(0, demo_email_util_1.maskEmail)(transfer.recipientEmail)}\nLink: ${inviteUrl}`);
            }
            await Promise.all([
                this.mail.sendTicketTransferEmail(n.ticket.owner.email, 'Transferência aguardando cadastro', `O convite foi enviado para ${transfer.recipientEmail}.`),
                this.mail.sendTicketTransferEmail(transfer.recipientEmail, 'Você recebeu um ingresso — crie sua conta no Pago', `${n.ticket.owner.name} enviou um ingresso de ${n.ticket.event.title}. Cadastre-se em até 7 dias para recebê-lo.`, inviteUrl),
            ]);
        }
    }
    async sendCompletedEmails(transfer, user) {
        const base = (this.config.get('FRONTEND_URL', 'http://localhost:3000')).split(',')[0].trim();
        await Promise.all([
            this.mail.sendTicketTransferEmail(transfer.sender.email, 'Seu ingresso foi transferido', `${transfer.event.title} foi transferido para ${user.name}. O QR Code anterior não é mais válido.`),
            this.mail.sendTicketTransferEmail(user.email, 'Você recebeu um ingresso no Pago', `${transfer.sender.name} transferiu um ingresso de ${transfer.event.title} para você.`, `${base}/my-tickets`),
        ]);
    }
};
exports.TicketTransfersService = TicketTransfersService;
__decorate([
    (0, schedule_1.Interval)(15 * 60 * 1000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TicketTransfersService.prototype, "expirePendingInvites", null);
exports.TicketTransfersService = TicketTransfersService = TicketTransfersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, mail_service_1.MailService, config_1.ConfigService])
], TicketTransfersService);
//# sourceMappingURL=ticket-transfers.service.js.map