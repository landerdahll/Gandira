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
var TicketsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const QRCode = __importStar(require("qrcode"));
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_util_1 = require("../../common/utils/crypto.util");
let TicketsService = TicketsService_1 = class TicketsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TicketsService_1.name);
    }
    async generateTicket(input, tx) {
        const db = tx ?? this.prisma;
        const token = (0, crypto_util_1.generateSecureToken)(32);
        const ticket = await db.ticket.create({
            data: {
                orderId: input.orderId,
                batchId: input.batchId,
                eventId: input.eventId,
                token,
                status: 'ACTIVE',
            },
        });
        const qrCodeUrl = await QRCode.toDataURL(token, {
            errorCorrectionLevel: 'H',
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
        });
        await db.ticket.update({
            where: { id: ticket.id },
            data: { qrCodeUrl },
        });
        this.logger.log(`Ticket ${ticket.id} generated for order ${input.orderId}`);
        return { ...ticket, qrCodeUrl };
    }
    async findUserTickets(userId, page = 1, limit = 20) {
        const take = Math.min(limit, 50);
        const skip = (page - 1) * take;
        const [data, total] = await Promise.all([
            this.prisma.ticket.findMany({
                where: { order: { userId } },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    event: { select: { title: true, slug: true, startDate: true, venue: true, coverImage: true } },
                    batch: { select: { name: true, ticketType: true } },
                    checkIn: { select: { checkedAt: true } },
                },
            }),
            this.prisma.ticket.count({ where: { order: { userId } } }),
        ]);
        return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
    }
    async findOne(ticketId, userId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                order: { select: { userId: true } },
                event: { select: { title: true, startDate: true, venue: true, address: true } },
                batch: { select: { name: true, ticketType: true, price: true } },
                checkIn: { select: { checkedAt: true, method: true } },
            },
        });
        if (!ticket)
            throw new common_1.NotFoundException('Ingresso não encontrado');
        if (ticket.order.userId !== userId)
            throw new common_1.ForbiddenException('Acesso negado');
        return ticket;
    }
    async validateAndCheckIn(token, eventId, staffId) {
        return this.prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findUnique({
                where: { token },
                include: {
                    checkIn: true,
                    batch: { select: { name: true, ticketType: true } },
                    order: { include: { user: { select: { name: true, email: true } } } },
                },
            });
            if (!ticket)
                return { valid: false, reason: 'Ingresso não encontrado', holder: null };
            const holder = {
                name: ticket.holderName ?? ticket.order?.user?.name ?? 'Titular não identificado',
                email: ticket.holderEmail ?? ticket.order?.user?.email ?? '',
                batch: ticket.batch?.name ?? '',
            };
            if (ticket.eventId !== eventId)
                return { valid: false, reason: 'Ingresso pertence a outro evento', holder };
            if (ticket.status === 'CANCELLED')
                return { valid: false, reason: 'Ingresso cancelado', holder };
            if (ticket.status === 'USED' || ticket.checkIn) {
                const when = ticket.checkIn?.checkedAt
                    ? new Date(ticket.checkIn.checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : '—';
                return { valid: false, reason: `Ingresso já utilizado às ${when}`, holder };
            }
            if (ticket.status !== 'ACTIVE')
                return { valid: false, reason: `Status inválido: ${ticket.status}`, holder };
            await Promise.all([
                tx.ticket.update({ where: { id: ticket.id }, data: { status: 'USED' } }),
                tx.checkIn.create({ data: { ticketId: ticket.id, eventId, staffId, method: 'QR_CODE' } }),
            ]);
            this.logger.log(`Ticket ${ticket.id} checked in at event ${eventId} by staff ${staffId}`);
            return { valid: true, reason: 'Entrada autorizada', holder };
        });
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = TicketsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map