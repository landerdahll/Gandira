"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const ticket_transfers_service_1 = require("./ticket-transfers.service");
describe('TicketTransfersService invitation security', () => {
    const rawToken = 'secure-one-time-token';
    const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
    const future = new Date(Date.now() + 60_000);
    let prisma;
    let service;
    beforeEach(() => {
        prisma = { ticketTransfer: { findUnique: jest.fn() } };
        service = new ticket_transfers_service_1.TicketTransfersService(prisma, {}, {});
    });
    it('aceita convite pendente somente para o e-mail normalizado', async () => {
        prisma.ticketTransfer.findUnique.mockResolvedValue({ id: 'tr1', status: 'PENDING_REGISTRATION', recipientEmail: 'destino@email.com', expiresAt: future });
        await expect(service.inspectInvite(rawToken, ' Destino@Email.com ')).resolves.toMatchObject({ id: 'tr1' });
        expect(prisma.ticketTransfer.findUnique).toHaveBeenCalledWith({ where: { invitationTokenHash: tokenHash } });
    });
    it.each(['CANCELLED', 'COMPLETED', 'EXPIRED'])('rejeita convite com status %s', async (status) => {
        prisma.ticketTransfer.findUnique.mockResolvedValue({ id: 'tr1', status, recipientEmail: 'destino@email.com', expiresAt: future });
        await expect(service.inspectInvite(rawToken, 'destino@email.com')).rejects.toBeInstanceOf(common_1.BadRequestException);
    });
    it('rejeita tentativa de cadastrar outro e-mail', async () => {
        prisma.ticketTransfer.findUnique.mockResolvedValue({ id: 'tr1', status: 'PENDING_REGISTRATION', recipientEmail: 'destino@email.com', expiresAt: future });
        await expect(service.inspectInvite(rawToken, 'intruso@email.com')).rejects.toThrow('O e-mail deve ser o mesmo do convite');
    });
    it('não consulta convite pelo token em texto puro', async () => {
        prisma.ticketTransfer.findUnique.mockResolvedValue(null);
        await expect(service.inspectInvite(rawToken, 'destino@email.com')).rejects.toBeInstanceOf(common_1.BadRequestException);
        expect(prisma.ticketTransfer.findUnique.mock.calls[0][0].where.invitationTokenHash).not.toBe(rawToken);
    });
});
//# sourceMappingURL=ticket-transfers.service.spec.js.map