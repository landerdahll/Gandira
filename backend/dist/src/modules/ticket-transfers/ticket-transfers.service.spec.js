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
describe('TicketTransfersService demo email mode', () => {
    const transfer = { id: 'tr1', recipientEmail: 'guest@example.com' };
    const notification = {
        invitationToken: 'temporary-invite-token',
        recipient: null,
        ticket: {
            owner: { email: 'owner@example.com', name: 'Owner' },
            event: { title: 'Demo Event' },
        },
    };
    function setup(demoMode) {
        const mail = { sendTicketTransferEmail: jest.fn().mockResolvedValue(undefined) };
        const config = {
            get: jest.fn((key, fallback) => ({
                DEMO_EMAIL_MODE: demoMode,
                FRONTEND_URL: 'https://demo.gandira.test',
            }[key] ?? fallback)),
        };
        const service = new ticket_transfers_service_1.TicketTransfersService({}, mail, config);
        return { service, mail };
    }
    it('gera e registra o link completo do convite sem deixar de enviar pela Resend', async () => {
        const { service, mail } = setup('true');
        const logger = jest.spyOn(service.logger, 'log');
        await service.sendRequestedEmails(transfer, notification);
        const inviteUrl = 'https://demo.gandira.test/auth/register?transferInvite=temporary-invite-token&email=guest%40example.com';
        expect(mail.sendTicketTransferEmail).toHaveBeenCalledWith(transfer.recipientEmail, expect.any(String), expect.any(String), inviteUrl);
        expect(logger).toHaveBeenCalledWith(expect.stringContaining('[DEMO EMAIL MODE] Convite de transferência'));
        expect(logger).toHaveBeenCalledWith(expect.stringContaining('Destinatário: g***@e***.com'));
        expect(logger).toHaveBeenCalledWith(expect.stringContaining(`Link: ${inviteUrl}`));
    });
    it('não registra tokens de convite quando DEMO_EMAIL_MODE=false', async () => {
        const { service, mail } = setup('false');
        const logger = jest.spyOn(service.logger, 'log');
        await service.sendRequestedEmails(transfer, notification);
        expect(mail.sendTicketTransferEmail).toHaveBeenCalledTimes(2);
        expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('[DEMO EMAIL MODE]'));
    });
});
//# sourceMappingURL=ticket-transfers.service.spec.js.map