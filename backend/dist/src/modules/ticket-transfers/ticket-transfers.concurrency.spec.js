"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ticket_transfers_service_1 = require("./ticket-transfers.service");
const tickets_service_1 = require("../tickets/tickets.service");
describe('ticket transfer concurrency claims', () => {
    const future = new Date(Date.now() + 60_000);
    function inviteState() {
        const state = {
            transfer: {
                id: 'transfer-1', ticketId: 'ticket-1', senderUserId: 'sender-1',
                recipientEmail: 'recipient@example.com', invitationTokenHash: 'ignored',
                status: 'PENDING_REGISTRATION', expiresAt: future,
                sender: { email: 'sender@example.com' }, event: { title: 'Event' },
            },
            ticket: { id: 'ticket-1', ownerUserId: 'sender-1', status: 'TRANSFER_PENDING', token: 'old-token' },
            histories: [],
        };
        const tx = {
            ticketTransfer: {
                findUnique: jest.fn(async ({ where }) => {
                    if (where.invitationTokenHash && state.transfer.invitationTokenHash === null)
                        return null;
                    return { ...state.transfer, ticket: { ...state.ticket } };
                }),
                updateMany: jest.fn(async ({ where, data }) => {
                    if (state.transfer.id !== where.id || state.transfer.status !== where.status)
                        return { count: 0 };
                    if (where.invitationTokenHash && state.transfer.invitationTokenHash === null)
                        return { count: 0 };
                    Object.assign(state.transfer, data);
                    return { count: 1 };
                }),
            },
            ticket: {
                updateMany: jest.fn(async ({ where, data }) => {
                    if (state.ticket.id !== where.id || state.ticket.status !== where.status || state.ticket.ownerUserId !== where.ownerUserId)
                        return { count: 0 };
                    Object.assign(state.ticket, data);
                    return { count: 1 };
                }),
            },
            ticketHistory: { createMany: jest.fn(async ({ data }) => state.histories.push(...data)) },
        };
        return { state, tx };
    }
    it('permite apenas uma conclusão para duas tentativas simultâneas do mesmo convite', async () => {
        const { state, tx } = inviteState();
        const service = new ticket_transfers_service_1.TicketTransfersService({}, {}, {});
        jest.spyOn(service, 'hashInviteToken').mockReturnValue('ignored');
        const user = { id: 'recipient-1', name: 'Recipient', email: 'recipient@example.com' };
        const prepared = { nextToken: 'next-token', qrCodeUrl: 'data:image/png' };
        const results = await Promise.allSettled([
            service.completeInviteInTransaction(tx, 'raw', user, prepared),
            service.completeInviteInTransaction(tx, 'raw', user, prepared),
        ]);
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
        expect(state.transfer.status).toBe('COMPLETED');
        expect(state.ticket.ownerUserId).toBe(user.id);
        expect(state.histories).toHaveLength(4);
    });
    it('permite apenas um vencedor entre cancelamento e conclusão pelo cadastro', async () => {
        const { state, tx } = inviteState();
        const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
        const mail = { sendTicketTransferEmail: jest.fn().mockResolvedValue(undefined) };
        const service = new ticket_transfers_service_1.TicketTransfersService(prisma, mail, {});
        jest.spyOn(service, 'hashInviteToken').mockReturnValue('ignored');
        const completion = service.completeInviteInTransaction(tx, 'raw', { id: 'recipient-1', name: 'Recipient', email: 'recipient@example.com' }, { nextToken: 'next-token', qrCodeUrl: 'data:image/png' });
        const cancellation = service.cancel('transfer-1', 'sender-1');
        const results = await Promise.allSettled([completion, cancellation]);
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect(['COMPLETED', 'CANCELLED']).toContain(state.transfer.status);
        expect(state.ticket.status).toBe('ACTIVE');
    });
    function activeTicketState() {
        const state = {
            ticket: {
                id: 'ticket-1', token: 'qr-token', ownerUserId: 'sender-1', status: 'ACTIVE',
                eventId: 'event-1', event: { allowTicketTransfers: true, startDate: future, title: 'Event' },
                checkIn: null, order: { status: 'PAID', user: { name: 'Sender', email: 'sender@example.com' } },
                batch: { name: 'Batch', ticketType: 'GENERAL' }, owner: { name: 'Sender', email: 'sender@example.com' },
            },
            transfers: [], checkIns: [], histories: [],
        };
        const tx = {
            ticket: {
                findUnique: jest.fn(async ({ where }) => {
                    if (where.token && where.token !== state.ticket.token)
                        return null;
                    return { ...state.ticket, checkIn: state.checkIns[0] ?? null };
                }),
                updateMany: jest.fn(async ({ where, data }) => {
                    if (state.ticket.id !== where.id || state.ticket.status !== where.status)
                        return { count: 0 };
                    if (where.ownerUserId && state.ticket.ownerUserId !== where.ownerUserId)
                        return { count: 0 };
                    if (where.token && state.ticket.token !== where.token)
                        return { count: 0 };
                    Object.assign(state.ticket, data);
                    return { count: 1 };
                }),
            },
            user: { findUnique: jest.fn().mockResolvedValue(null) },
            ticketTransfer: { create: jest.fn(async ({ data }) => { const row = { id: `tr-${state.transfers.length + 1}`, ...data }; state.transfers.push(row); return row; }) },
            ticketHistory: {
                create: jest.fn(async ({ data }) => state.histories.push(data)),
                createMany: jest.fn(async ({ data }) => state.histories.push(...data)),
            },
            checkIn: { create: jest.fn(async ({ data }) => state.checkIns.push({ ...data, checkedAt: new Date() })) },
        };
        return { state, tx };
    }
    it('deixa apenas um vencedor entre check-in e transferência', async () => {
        const { state, tx } = activeTicketState();
        const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
        const transfers = new ticket_transfers_service_1.TicketTransfersService(prisma, { sendTicketTransferEmail: jest.fn().mockResolvedValue(undefined) }, { get: jest.fn((_key, fallback) => fallback) });
        const tickets = new tickets_service_1.TicketsService(prisma);
        const results = await Promise.allSettled([
            tickets.validateAndCheckIn('qr-token', 'event-1', 'staff-1'),
            transfers.request('ticket-1', 'sender-1', 'new@example.com'),
        ]);
        const checkInWon = results[0].status === 'fulfilled' && results[0].value.valid;
        const transferWon = results[1].status === 'fulfilled';
        expect(Number(checkInWon) + Number(transferWon)).toBe(1);
        expect(state.checkIns.length + state.transfers.length).toBe(1);
    });
    it('deixa apenas uma transferência em solicitações duplicadas concorrentes', async () => {
        const { state, tx } = activeTicketState();
        const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
        const service = new ticket_transfers_service_1.TicketTransfersService(prisma, { sendTicketTransferEmail: jest.fn().mockResolvedValue(undefined) }, { get: jest.fn((_key, fallback) => fallback) });
        const results = await Promise.allSettled([
            service.request('ticket-1', 'sender-1', 'new@example.com'),
            service.request('ticket-1', 'sender-1', 'new@example.com'),
        ]);
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect(state.transfers).toHaveLength(1);
        expect(state.ticket.status).toBe('TRANSFER_PENDING');
    });
});
//# sourceMappingURL=ticket-transfers.concurrency.spec.js.map