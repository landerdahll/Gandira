import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, PrismaClient, TicketTransferStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { withSerializableRetry } from '../common/utils/serializable-retry.util';
import { AuthService } from '../modules/auth/auth.service';
import { TicketTransfersService } from '../modules/ticket-transfers/ticket-transfers.service';
import { TicketsService } from '../modules/tickets/tickets.service';

const databaseUrl = process.env.DATABASE_URL ?? '';
const integrationEnabled = process.env.RUN_INTEGRATION === 'true';
const describeIntegration = integrationEnabled ? describe : describe.skip;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

jest.setTimeout(120_000);

function barrier(participants: number) {
  let arrived = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  return async () => {
    arrived += 1;
    if (arrived === participants) release();
    await ready;
  };
}

describeIntegration('Ticket transfers with real PostgreSQL Serializable transactions', () => {
  const runPrefix = `it-transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const prismaA = new PrismaClient();
  const prismaB = new PrismaClient();
  const sentMail: Array<{ to: string; actionUrl?: string }> = [];
  const mail = {
    sendTicketTransferEmail: jest.fn(async (to: string, _subject: string, _message: string, actionUrl?: string) => {
      sentMail.push({ to, actionUrl });
    }),
    sendVerificationEmail: jest.fn(async () => undefined),
  };
  const config = {
    get: <T>(_key: string, fallback?: T): T => fallback as T,
  };
  const transferA = new TicketTransfersService(prismaA as never, mail as never, config as never);
  const transferB = new TicketTransfersService(prismaB as never, mail as never, config as never);
  const ticketsA = new TicketsService(prismaA as never);
  let fixtureSequence = 0;

  beforeAll(async () => {
    if (!databaseUrl.includes('127.0.0.1:55432/outrahora_test')) {
      throw new Error('Integration tests refuse to run outside the temporary outrahora_test database');
    }
    const [identity] = await prismaA.$queryRaw<Array<{ database: string; port: number }>>`
      SELECT current_database() AS database, inet_server_port() AS port
    `;
    expect(identity.database).toBe('outrahora_test');
    expect(identity.port).toBeGreaterThan(0);
    console.info(`TEMP_DATABASE_IDENTITY database=${identity.database} publishedPort=55432 serverPort=${identity.port}`);
  });

  afterAll(async () => {
    await cleanupRunData();
    await Promise.all([prismaA.$disconnect(), prismaB.$disconnect()]);
  });

  async function cleanupRunData() {
    const eventIds = (await prismaA.event.findMany({
      where: { slug: { startsWith: runPrefix } },
      select: { id: true },
    })).map(({ id }) => id);
    const userWhere = { email: { startsWith: runPrefix } } as const;

    if (eventIds.length) {
      await prismaA.ticketHistory.deleteMany({ where: { ticket: { eventId: { in: eventIds } } } });
      await prismaA.checkIn.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.ticketTransfer.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.ticket.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.orderItem.deleteMany({ where: { order: { eventId: { in: eventIds } } } });
      await prismaA.order.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.batch.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    await prismaA.refreshToken.deleteMany({ where: { user: userWhere } });
    await prismaA.emailVerificationToken.deleteMany({ where: { user: userWhere } });
    await prismaA.passwordResetToken.deleteMany({ where: { user: userWhere } });
    await prismaA.auditLog.deleteMany({ where: { user: userWhere } });
    await prismaA.user.deleteMany({ where: userWhere });
  }

  async function createFixture(label: string) {
    fixtureSequence += 1;
    const key = `${runPrefix}-${fixtureSequence}-${label}`;
    const owner = await prismaA.user.create({
      data: { email: `${key}-owner@example.test`, password: 'test-hash', name: `${label} Owner` },
    });
    const staff = await prismaA.user.create({
      data: { email: `${key}-staff@example.test`, password: 'test-hash', name: `${label} Staff`, role: 'STAFF' },
    });
    const event = await prismaA.event.create({
      data: {
        producerId: owner.id,
        title: `${label} Event`, description: 'integration', slug: key,
        venue: 'Test', address: 'Test', city: 'Test', state: 'TS',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED', allowTicketTransfers: true,
      },
    });
    const batch = await prismaA.batch.create({
      data: {
        eventId: event.id, name: 'Integration Batch', price: 10, quantity: 10,
        startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const order = await prismaA.order.create({
      data: {
        userId: owner.id, eventId: event.id, status: 'PAID', subtotal: 10,
        platformFee: 0, total: 10, expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const ticket = await prismaA.ticket.create({
      data: {
        orderId: order.id, batchId: batch.id, eventId: event.id, ownerUserId: owner.id,
        token: `${key}-qr`, status: 'ACTIVE', holderName: owner.name, holderEmail: owner.email,
        qrCodeUrl: 'data:image/png;base64,integration',
      },
    });
    return { key, owner, staff, event, batch, order, ticket };
  }

  async function createPendingInvite(fixture: Awaited<ReturnType<typeof createFixture>>, suffix: string) {
    const rawToken = `${fixture.key}-${suffix}-invite`;
    const recipientEmail = `${fixture.key}-${suffix}-recipient@example.test`;
    await prismaA.ticket.update({
      where: { id: fixture.ticket.id },
      data: { status: 'TRANSFER_PENDING', qrCodeUrl: null },
    });
    const transfer = await prismaA.ticketTransfer.create({
      data: {
        ticketId: fixture.ticket.id, eventId: fixture.event.id, senderUserId: fixture.owner.id,
        recipientEmail, status: 'PENDING_REGISTRATION', invitationTokenHash: digest(rawToken),
        expiresAt: new Date(Date.now() + 60_000), previousQrIdentifier: digest(fixture.ticket.token),
      },
    });
    await prismaA.ticketHistory.createMany({ data: [
      { ticketId: fixture.ticket.id, transferId: transfer.id, action: 'TRANSFER_REQUESTED', actorUserId: fixture.owner.id },
      { ticketId: fixture.ticket.id, transferId: transfer.id, action: 'TRANSFER_INVITATION_SENT', actorUserId: fixture.owner.id },
    ] });
    return { rawToken, recipientEmail, transfer };
  }

  it('1. allows only one simultaneous transfer request for a ticket', async () => {
    const fixture = await createFixture('duplicate-request');
    const start = barrier(2);
    const invoke = async (service: TicketTransfersService, recipient: string) => {
      await start();
      return service.request(fixture.ticket.id, fixture.owner.id, recipient);
    };

    const results = await Promise.allSettled([
      invoke(transferA, `${fixture.key}-one@example.test`),
      invoke(transferB, `${fixture.key}-two@example.test`),
    ]);
    const finalTicket = await prismaA.ticket.findUniqueOrThrow({ where: { id: fixture.ticket.id } });
    const transfers = await prismaA.ticketTransfer.findMany({ where: { ticketId: fixture.ticket.id } });

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toBeInstanceOf(ConflictException);
    expect(transfers.filter(({ status }) => status === 'PENDING_REGISTRATION')).toHaveLength(1);
    expect(finalTicket.status).toBe('TRANSFER_PENDING');
    console.info(`SCENARIO_1_FINAL ticketStatus=${finalTicket.status} pendingTransfers=${transfers.filter(({ status }) => status === 'PENDING_REGISTRATION').length}`);
  });

  it('2. never commits both check-in and an active transfer', async () => {
    const fixture = await createFixture('checkin-transfer');
    const start = barrier(2);
    const checkIn = async () => { await start(); return ticketsA.validateAndCheckIn(fixture.ticket.token, fixture.event.id, fixture.staff.id); };
    const request = async () => { await start(); return transferB.request(fixture.ticket.id, fixture.owner.id, `${fixture.key}-recipient@example.test`); };

    const [checkInResult, transferResult] = await Promise.allSettled([checkIn(), request()]);
    const finalTicket = await prismaA.ticket.findUniqueOrThrow({ where: { id: fixture.ticket.id } });
    const checkInRow = await prismaA.checkIn.findUnique({ where: { ticketId: fixture.ticket.id } });
    const activeTransfers = await prismaA.ticketTransfer.count({
      where: { ticketId: fixture.ticket.id, status: { in: ['PENDING_REGISTRATION', 'COMPLETED'] } },
    });

    expect(Number(Boolean(checkInRow)) + Number(activeTransfers > 0)).toBe(1);
    expect(checkInRow && activeTransfers).toBeFalsy();
    expect(['USED', 'TRANSFER_PENDING']).toContain(finalTicket.status);
    const checkInWon = checkInResult.status === 'fulfilled' && checkInResult.value.valid;
    const transferWon = transferResult.status === 'fulfilled';
    expect(Number(checkInWon) + Number(transferWon)).toBe(1);
    console.info(`SCENARIO_2_FINAL ticketStatus=${finalTicket.status} checkIns=${Number(Boolean(checkInRow))} activeTransfers=${activeTransfers}`);
  });

  it('3. completes the same invite only once without an orphan account', async () => {
    const fixture = await createFixture('double-completion');
    const invite = await createPendingInvite(fixture, 'double');
    const jwt = new JwtService({ secret: 'integration-secret' });
    const authA = new AuthService(prismaA as never, jwt, config as never, mail as never, transferA);
    const authB = new AuthService(prismaB as never, jwt, config as never, mail as never, transferB);
    const start = barrier(2);
    const register = async (service: AuthService, name: string) => {
      await start();
      return service.register({ name, email: invite.recipientEmail, password: 'StrongPass1', invitationToken: invite.rawToken });
    };

    const results = await Promise.allSettled([register(authA, 'Recipient One'), register(authB, 'Recipient Two')]);
    const recipientUsers = await prismaA.user.findMany({ where: { email: invite.recipientEmail } });
    const finalTransfer = await prismaA.ticketTransfer.findUniqueOrThrow({ where: { id: invite.transfer.id } });
    const finalTicket = await prismaA.ticket.findUniqueOrThrow({ where: { id: fixture.ticket.id } });
    const completions = await prismaA.ticketHistory.count({ where: { transferId: invite.transfer.id, action: 'TRANSFER_COMPLETED' } });

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(recipientUsers).toHaveLength(1);
    expect(finalTransfer.status).toBe('COMPLETED');
    expect(finalTicket.ownerUserId).toBe(recipientUsers[0].id);
    expect(completions).toBe(1);
    console.info(`SCENARIO_3_FINAL transferStatus=${finalTransfer.status} recipientUsers=${recipientUsers.length} completionHistory=${completions}`);
  });

  it('4. leaves one valid result for simultaneous cancellation and completion', async () => {
    const fixture = await createFixture('cancel-complete');
    const invite = await createPendingInvite(fixture, 'cancel');
    const recipient = await prismaA.user.create({ data: { email: invite.recipientEmail, password: 'test-hash', name: 'Recipient' } });
    const start = barrier(2);
    const cancel = async () => { await start(); return transferA.cancel(invite.transfer.id, fixture.owner.id); };
    const complete = async () => {
      await start();
      return withSerializableRetry(() => prismaB.$transaction(
        (tx) => transferB.completeInviteInTransaction(tx, invite.rawToken, recipient, { nextToken: `${fixture.key}-new`, qrCodeUrl: 'data:image/png;base64,new' }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ));
    };

    const results = await Promise.allSettled([cancel(), complete()]);
    const finalTransfer = await prismaA.ticketTransfer.findUniqueOrThrow({ where: { id: invite.transfer.id } });
    const finalTicket = await prismaA.ticket.findUniqueOrThrow({ where: { id: fixture.ticket.id } });

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(['CANCELLED', 'COMPLETED']).toContain(finalTransfer.status);
    expect(finalTicket.status).toBe('ACTIVE');
    expect(finalTicket.ownerUserId).toBe(finalTransfer.status === 'COMPLETED' ? recipient.id : fixture.owner.id);
    console.info(`SCENARIO_4_FINAL transferStatus=${finalTransfer.status} ticketStatus=${finalTicket.status} owner=${finalTicket.ownerUserId}`);
  });

  it('5. leaves one valid result for simultaneous expiration and completion', async () => {
    const fixture = await createFixture('expire-complete');
    const invite = await createPendingInvite(fixture, 'expire');
    const recipient = await prismaA.user.create({ data: { email: invite.recipientEmail, password: 'test-hash', name: 'Recipient' } });
    await prismaA.ticketTransfer.update({ where: { id: invite.transfer.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    const start = barrier(2);
    const expire = async () => { await start(); return transferA.expirePendingInvites(); };
    const complete = async () => {
      await start();
      return withSerializableRetry(() => prismaB.$transaction(
        (tx) => transferB.completeInviteInTransaction(tx, invite.rawToken, recipient, { nextToken: `${fixture.key}-new`, qrCodeUrl: 'data:image/png;base64,new' }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ));
    };

    await Promise.allSettled([expire(), complete()]);
    const finalTransfer = await prismaA.ticketTransfer.findUniqueOrThrow({ where: { id: invite.transfer.id } });
    const finalTicket = await prismaA.ticket.findUniqueOrThrow({ where: { id: fixture.ticket.id } });

    expect(finalTransfer.status).toBe('EXPIRED');
    expect(finalTicket.status).toBe('ACTIVE');
    expect(finalTicket.ownerUserId).toBe(fixture.owner.id);
    expect(await prismaA.ticketHistory.count({ where: { transferId: invite.transfer.id, action: 'TRANSFER_COMPLETED' } })).toBe(0);
    console.info(`SCENARIO_5_FINAL transferStatus=${finalTransfer.status} ticketStatus=${finalTicket.status} completionHistory=0`);
  });

  it('6. rolls back every invited-registration write when invite completion fails', async () => {
    const fixture = await createFixture('registration-rollback');
    const invite = await createPendingInvite(fixture, 'rollback');
    await prismaA.ticket.update({ where: { id: fixture.ticket.id }, data: { status: 'USED' } });
    const auth = new AuthService(prismaA as never, new JwtService({ secret: 'integration-secret' }), config as never, mail as never, transferA);

    await expect(auth.register({ name: 'Rollback Recipient', email: invite.recipientEmail, password: 'StrongPass1', invitationToken: invite.rawToken }))
      .rejects.toBeInstanceOf(ConflictException);

    const user = await prismaA.user.findUnique({ where: { email: invite.recipientEmail } });
    const finalTransfer = await prismaA.ticketTransfer.findUniqueOrThrow({ where: { id: invite.transfer.id } });
    const finalTicket = await prismaA.ticket.findUniqueOrThrow({ where: { id: fixture.ticket.id } });
    expect(user).toBeNull();
    expect(await prismaA.emailVerificationToken.count({ where: { user: { email: invite.recipientEmail } } })).toBe(0);
    expect(await prismaA.refreshToken.count({ where: { user: { email: invite.recipientEmail } } })).toBe(0);
    expect(await prismaA.auditLog.count({ where: { user: { email: invite.recipientEmail } } })).toBe(0);
    expect(finalTransfer).toMatchObject({ status: 'PENDING_REGISTRATION', recipientUserId: null, invitationTokenHash: digest(invite.rawToken) });
    expect(finalTicket).toMatchObject({ status: 'USED', ownerUserId: fixture.owner.id });
    expect(await prismaA.ticketHistory.count({ where: { transferId: invite.transfer.id } })).toBe(2);
    console.info(`SCENARIO_6_FINAL user=null verificationTokens=0 refreshTokens=0 transferStatus=${finalTransfer.status} ticketStatus=${finalTicket.status} history=2`);
  });

  it('provokes a real P2034, records retries, and never retries P2002', async () => {
    const fixture = await createFixture('p2034');
    const firstAttempts = { a: 0, b: 0 };
    const firstRead = barrier(2);
    const update = (client: PrismaClient, key: 'a' | 'b', name: string) => withSerializableRetry(async () => {
      firstAttempts[key] += 1;
      return client.$transaction(async (tx) => {
        await tx.user.findUniqueOrThrow({ where: { id: fixture.owner.id } });
        if (firstAttempts[key] === 1) await firstRead();
        return tx.user.update({ where: { id: fixture.owner.id }, data: { name } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    });

    await Promise.all([update(prismaA, 'a', 'Serializable A'), update(prismaB, 'b', 'Serializable B')]);
    expect(firstAttempts.a + firstAttempts.b).toBeGreaterThan(2);

    let nonRetryAttempts = 0;
    const nonRetryError = new Prisma.PrismaClientKnownRequestError('unique violation', { code: 'P2002', clientVersion: Prisma.prismaVersion.client });
    await expect(withSerializableRetry(async () => { nonRetryAttempts += 1; throw nonRetryError; })).rejects.toMatchObject({ code: 'P2002' });
    expect(nonRetryAttempts).toBe(1);

    console.info(`REAL_P2034_RETRY_EVIDENCE attemptsA=${firstAttempts.a} attemptsB=${firstAttempts.b} retries=${firstAttempts.a + firstAttempts.b - 2}`);
  });
});
