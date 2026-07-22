"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const club_members_service_1 = require("./club-members.service");
describe('ClubMembersService', () => {
    const activeMember = {
        id: 'member-1',
        name: 'Maria',
        email: 'maria@example.com',
        phone: '48999999999',
        discountPercentage: new client_1.Prisma.Decimal('10.00'),
        isActive: true,
        activatedAt: new Date(),
        deactivatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    function setup() {
        const tx = {
            clubMember: {
                create: jest.fn().mockResolvedValue(activeMember),
                update: jest.fn().mockResolvedValue(activeMember),
            },
            clubBenefitUsage: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
            auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        const prisma = {
            clubMember: {
                findMany: jest.fn().mockResolvedValue([activeMember]),
                count: jest.fn().mockResolvedValue(1),
                groupBy: jest.fn().mockResolvedValue([
                    { isActive: true, _count: { _all: 3 } },
                    { isActive: false, _count: { _all: 2 } },
                ]),
                findUnique: jest.fn().mockResolvedValue({ ...activeMember, usages: [] }),
            },
            user: {
                findMany: jest.fn().mockResolvedValue([{
                        id: 'user-1', name: 'Maria', email: ' MARIA@EXAMPLE.COM ', isActive: true,
                    }]),
            },
            $transaction: jest.fn(async (callback) => callback(tx)),
        };
        return { service: new club_members_service_1.ClubMembersService(prisma), prisma, tx };
    }
    it('cadastra e-mail normalizado e audita somente o valor mascarado', async () => {
        const { service, tx } = setup();
        const result = await service.create({
            email: '  MARIA@EXAMPLE.COM  ', name: '  Maria  ', phone: ' (48) 99999-9999 ',
        }, 'admin-1');
        expect(tx.clubMember.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                email: 'maria@example.com', name: 'Maria', phone: '48999999999', isActive: true,
                discountPercentage: new client_1.Prisma.Decimal('10.00'),
            }),
        });
        expect(tx.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'admin-1', action: 'CLUB_MEMBER_CREATED',
                metadata: { email: 'm***@e***.com', isActive: true },
            }),
        });
        expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain('maria@example.com');
        expect(result).toEqual(expect.objectContaining({ hasLinkedAccount: true }));
    });
    it.each([
        ['10', '10.00'],
        ['10.5', '10.50'],
        ['10.50', '10.50'],
    ])('normaliza o percentual informado %s como Decimal %s', async (input, expected) => {
        const { service, tx } = setup();
        await service.create({ email: 'maria@example.com', discountPercentage: input }, 'admin-1');
        const percentage = tx.clubMember.create.mock.calls[0][0].data.discountPercentage;
        expect(percentage.toFixed(2)).toBe(expected);
    });
    it.each(['0', '-1', '100', '100.01', '10.123', '', '1e1', 'NaN', 'Infinity'])('rejeita percentual inválido %p', async (value) => {
        const { service, tx } = setup();
        await expect(service.create({ email: 'maria@example.com', discountPercentage: value }, 'admin-1'))
            .rejects.toBeInstanceOf(common_1.BadRequestException);
        expect(tx.clubMember.create).not.toHaveBeenCalled();
    });
    it('altera o percentual, audita valores anterior e novo e não altera snapshots de usos', async () => {
        const { service, tx } = setup();
        await service.updateDiscount(activeMember.id, '15.75', 'admin-1');
        const updated = tx.clubMember.update.mock.calls[0][0].data.discountPercentage;
        expect(updated.toFixed(2)).toBe('15.75');
        expect(tx.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: 'CLUB_MEMBER_DISCOUNT_UPDATED',
                metadata: {
                    email: 'm***@e***.com',
                    previousDiscountPercentage: '10.00',
                    newDiscountPercentage: '15.75',
                },
            }),
        });
        expect(tx.clubBenefitUsage.updateMany).not.toHaveBeenCalled();
    });
    it('lista membros e vincula a conta por e-mail ignorando caixa e espaços', async () => {
        const { service, prisma } = setup();
        const result = await service.list(1, 20, 'MARIA@EXAMPLE.COM');
        expect(prisma.clubMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { OR: expect.arrayContaining([{ email: { contains: 'MARIA@EXAMPLE.COM', mode: 'insensitive' } }]) },
        }));
        expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { OR: [{ email: { contains: 'maria@example.com', mode: 'insensitive' } }] },
        }));
        expect(result.data[0]).toEqual(expect.objectContaining({
            hasLinkedAccount: true,
            linkedAccount: expect.objectContaining({ id: 'user-1' }),
        }));
        expect(result.summary).toEqual({ active: 3, inactive: 2, total: 5 });
    });
    it('não vincula conta com e-mail normalizado diferente', async () => {
        const { service, prisma } = setup();
        prisma.user.findMany.mockResolvedValue([{
                id: 'user-2', name: 'Outra pessoa', email: 'outra@example.com', isActive: true,
            }]);
        const result = await service.list();
        expect(result.data[0]).toEqual(expect.objectContaining({
            hasLinkedAccount: false,
            linkedAccount: null,
        }));
    });
    it('normaliza busca por telefone para somente dígitos', async () => {
        const { service, prisma } = setup();
        await service.list(1, 20, '(48) 99999-9999');
        expect(prisma.clubMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { OR: expect.arrayContaining([{ phone: { contains: '48999999999' } }]) },
        }));
    });
    it('desativa o membro, libera reservas e grava auditoria mascarada', async () => {
        const { service, tx } = setup();
        await service.deactivate(activeMember.id, 'admin-1');
        expect(tx.clubMember.update).toHaveBeenCalledWith({
            where: { id: activeMember.id },
            data: expect.objectContaining({ isActive: false, deactivatedAt: expect.any(Date) }),
        });
        expect(tx.clubBenefitUsage.updateMany).toHaveBeenCalledWith({
            where: { clubMemberId: activeMember.id, status: 'RESERVED' },
            data: expect.objectContaining({ status: 'RELEASED', releaseReason: 'MEMBER_DEACTIVATED' }),
        });
        expect(tx.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: 'CLUB_MEMBER_DEACTIVATED', metadata: { email: 'm***@e***.com', isActive: false },
            }),
        });
    });
    it('ativa um membro inativo sem alterar reservas', async () => {
        const { service, prisma, tx } = setup();
        prisma.clubMember.findUnique.mockResolvedValue({ ...activeMember, isActive: false, deactivatedAt: new Date() });
        await service.activate(activeMember.id, 'admin-1');
        expect(tx.clubMember.update).toHaveBeenCalledWith({
            where: { id: activeMember.id },
            data: { isActive: true, activatedAt: expect.any(Date), deactivatedAt: null },
        });
        expect(tx.clubBenefitUsage.updateMany).not.toHaveBeenCalled();
    });
    it('retorna 404 ao consultar membro inexistente', async () => {
        const { service, prisma } = setup();
        prisma.clubMember.findUnique.mockResolvedValue(null);
        await expect(service.findOne('missing')).rejects.toBeInstanceOf(common_1.NotFoundException);
    });
    it('consulta o histórico com evento, lote e pedidos relacionados', async () => {
        const { service, prisma } = setup();
        await service.findOne(activeMember.id);
        expect(prisma.clubMember.findUnique).toHaveBeenCalledWith({
            where: { id: activeMember.id },
            include: {
                usages: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        event: { select: { id: true, title: true } },
                        batch: { select: { id: true, name: true } },
                        reservedOrder: { select: { id: true, status: true } },
                        confirmedOrder: { select: { id: true, status: true } },
                    },
                },
            },
        });
    });
});
//# sourceMappingURL=club-members.service.spec.js.map