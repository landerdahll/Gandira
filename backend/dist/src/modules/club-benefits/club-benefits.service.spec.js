"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const club_benefits_service_1 = require("./club-benefits.service");
describe('ClubBenefitsService', () => {
    const service = new club_benefits_service_1.ClubBenefitsService();
    const now = new Date('2026-07-22T20:00:00.000Z');
    function tx(options = {}) {
        return {
            user: { findUnique: jest.fn().mockResolvedValue({ email: ' MEMBER@EXAMPLE.COM ' }) },
            clubMember: { findUnique: jest.fn().mockResolvedValue(options.member === undefined ? {
                    id: 'member-1', isActive: true, discountPercentage: new client_1.Prisma.Decimal('12.50'),
                } : options.member) },
            clubBenefitUsage: {
                findFirst: jest.fn().mockResolvedValue(options.usage ?? null),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                create: jest.fn().mockResolvedValue({ id: 'usage-1' }),
            },
        };
    }
    const items = [
        { batchId: 'b-low', batchName: 'Comum', sortOrder: 0, quantity: 2, unitPrice: new client_1.Prisma.Decimal('80.00') },
        { batchId: 'b-high-2', batchName: 'VIP 2', sortOrder: 2, quantity: 1, unitPrice: new client_1.Prisma.Decimal('120.00') },
        { batchId: 'b-high-1', batchName: 'VIP 1', sortOrder: 1, quantity: 3, unitPrice: new client_1.Prisma.Decimal('120.00') },
    ];
    it('normaliza e-mail, escolhe uma unidade mais cara e desempata por sortOrder', async () => {
        const client = tx();
        const result = await service.evaluateInTransaction(client, {
            userId: 'user-1', eventId: 'event-1', items, hasCoupon: false, now,
        });
        expect(client.clubMember.findUnique).toHaveBeenCalledWith({ where: { email: 'member@example.com' } });
        expect(result).toMatchObject({
            applied: true, reason: 'AVAILABLE', batchId: 'b-high-1', batchName: 'VIP 1',
        });
        expect(result.discountPercentage?.toFixed(2)).toBe('12.50');
        expect(result.originalAmount?.toFixed(2)).toBe('120.00');
        expect(result.discountAmount?.toFixed(2)).toBe('15.00');
        expect(result.finalAmount?.toFixed(2)).toBe('105.00');
    });
    it.each([
        [null, 'NOT_MEMBER'],
        [{ id: 'member-1', isActive: false, discountPercentage: new client_1.Prisma.Decimal(10) }, 'INACTIVE_MEMBER'],
    ])('não aplica para membro ausente/inativo', async (member, reason) => {
        const result = await service.evaluateInTransaction(tx({ member }), {
            userId: 'user-1', eventId: 'event-1', items, hasCoupon: false, now,
        });
        expect(result).toEqual({ applied: false, reason });
    });
    it('não consome benefício quando todos os ingressos são gratuitos', async () => {
        const result = await service.evaluateInTransaction(tx(), {
            userId: 'user-1', eventId: 'event-1',
            items: [{ ...items[0], unitPrice: new client_1.Prisma.Decimal(0) }], hasCoupon: false, now,
        });
        expect(result).toEqual({ applied: false, reason: 'NO_PAID_TICKETS' });
    });
    it('permite cupom quando o uso já foi confirmado', async () => {
        const result = await service.evaluateInTransaction(tx({ usage: { status: 'CONFIRMED' } }), {
            userId: 'user-1', eventId: 'event-1', items, hasCoupon: true, now,
        });
        expect(result).toEqual({ applied: false, reason: 'ALREADY_USED' });
    });
    it('rejeita cupom quando o benefício está disponível', async () => {
        await expect(service.evaluateInTransaction(tx(), {
            userId: 'user-1', eventId: 'event-1', items, hasCoupon: true, now,
        })).rejects.toBeInstanceOf(common_1.BadRequestException);
    });
    it('retorna conflito para reserva concorrente válida', async () => {
        await expect(service.evaluateInTransaction(tx({ usage: {
                status: 'RESERVED', reservationExpiresAt: new Date(now.getTime() + 60_000),
            } }), {
            userId: 'user-1', eventId: 'event-1', items, hasCoupon: false, now,
        })).rejects.toBeInstanceOf(common_1.ConflictException);
    });
    it('libera reserva vencida e cria uma nova decisão sem sobrescrever o histórico', async () => {
        const client = tx({ usage: {
                id: 'old-usage', status: 'RESERVED', reservationExpiresAt: new Date(now.getTime() - 1),
            } });
        const result = await service.evaluateInTransaction(client, {
            userId: 'user-1', eventId: 'event-1', items, hasCoupon: false, now,
        });
        expect(client.clubBenefitUsage.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'old-usage', status: 'RESERVED', activeMarker: true },
            data: expect.objectContaining({ status: 'RELEASED', activeMarker: null }),
        }));
        expect(result.applied).toBe(true);
    });
});
//# sourceMappingURL=club-benefits.service.spec.js.map