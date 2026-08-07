import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationInvitationsService } from './organization-invitations.service';

describe('OrganizationInvitationsService', () => {
  let tx: any;
  let prisma: any;
  let access: any;
  let outbox: any;
  let tokens: any;
  let service: OrganizationInvitationsService;

  beforeEach(() => {
    tx = {
      organization: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      organizationMember: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      organizationInvitation: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      emailOutbox: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      user: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { ...tx, $transaction: jest.fn((callback: any) => callback(tx)) };
    access = { forOrganization: jest.fn().mockResolvedValue({ organizationMemberId: 'admin-membership' }) };
    outbox = { enqueue: jest.fn().mockResolvedValue({}) };
    tokens = { hashForRecord: jest.fn().mockReturnValue('stored-hash'), matches: jest.fn().mockReturnValue(true) };
    service = new OrganizationInvitationsService(prisma, access, outbox, tokens);
  });

  it('creates a 30-day invitation and enqueues email without a raw token', async () => {
    tx.organization.findUnique.mockResolvedValue({ id: 'org-a', name: 'Outra Hora', isActive: true });
    tx.user.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({ name: 'William Landerdahl' });
    tx.organizationInvitation.findUnique.mockResolvedValue(null);
    tx.organizationInvitation.create.mockImplementation(({ data }: any) => ({ ...data, resendCount: 0 }));
    const before = Date.now();
    const invitation: any = await service.create('org-a', { id: 'admin' }, { email: ' Pessoa@Example.com ', role: 'PRODUCER', customMessage: 'Bem-vindo!' });
    expect(access.forOrganization).toHaveBeenCalledWith({ id: 'admin' }, 'org-a', 'INVITATIONS_MANAGE', tx);
    expect(invitation.email).toBe('pessoa@example.com');
    expect(invitation.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000);
    const queued = outbox.enqueue.mock.calls[0][0];
    expect(queued.payload).toMatchObject({ inviterName: 'William Landerdahl', organizationName: 'Outra Hora', role: 'PRODUCER', customMessage: 'Bem-vindo!', tokenPurpose: 'organization-invite' });
    expect(JSON.stringify(queued.payload)).not.toContain('stored-hash');
    expect(JSON.stringify(queued.payload)).not.toContain('.signature');
  });

  it('prevents invitations for an active organization member', async () => {
    tx.organization.findUnique.mockResolvedValue({ id: 'org-a', name: 'Outra Hora', isActive: true });
    tx.user.findFirst.mockResolvedValue({ id: 'existing' });
    tx.organizationMember.findFirst.mockResolvedValue({ id: 'membership' });
    await expect(service.create('org-a', { id: 'admin' }, { email: 'member@example.com', role: 'STAFF' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it('prevents a duplicate pending invitation for the same organization and email', async () => {
    tx.organization.findUnique.mockResolvedValue({ id: 'org-a', name: 'Outra Hora', isActive: true });
    tx.user.findFirst.mockResolvedValue(null);
    tx.organizationInvitation.findUnique.mockResolvedValue({ id: 'pending-invite' });
    await expect(service.create('org-a', { id: 'admin' }, { email: 'guest@example.com', role: 'STAFF' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it('accepts only the exact normalized invited email and creates membership atomically', async () => {
    const invitation = { id: 'invite-1', organizationId: 'org-a', email: 'guest@example.com', role: 'STAFF', status: 'PENDING', tokenHash: 'stored-hash', activeKey: 'active', expiresAt: new Date(Date.now() + 60_000), organization: { id: 'org-a', name: 'Outra Hora', slug: 'outrahora', isActive: true } };
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation);
    tx.user.findFirst.mockResolvedValue({ id: 'guest' });
    tx.user.findUnique.mockResolvedValue({ id: 'guest', email: 'Guest@Example.com', isActive: true, isVerified: true });
    tx.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
    tx.organizationMember.findUnique.mockResolvedValue(null);
    tx.organizationMember.create.mockResolvedValue({ id: 'membership-1' });
    await expect(service.accept('invite-1.signature', { id: 'guest' })).resolves.toMatchObject({ organization: { id: 'org-a' }, role: 'STAFF' });
    expect(tx.organizationMember.create).toHaveBeenCalledWith({ data: { organizationId: 'org-a', userId: 'guest', role: 'STAFF', status: 'ACTIVE' } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_INVITATION_ACCEPTED' }) });

    tx.user.findUnique.mockResolvedValue({ id: 'other', email: 'other@example.com', isActive: true, isVerified: true });
    await expect(service.accept('invite-1.signature', { id: 'other' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('changes the role on the same pending invitation', async () => {
    tx.organizationInvitation.findFirst.mockResolvedValue({ id: 'invite-1', organizationId: 'org-a', role: 'PRODUCER', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000) });
    tx.organizationInvitation.update.mockResolvedValue({ id: 'invite-1', role: 'STAFF', status: 'PENDING' });
    await service.updateRole('org-a', 'invite-1', 'STAFF', { id: 'admin' });
    expect(tx.organizationInvitation.update).toHaveBeenCalledWith({ where: { id: 'invite-1' }, data: { role: 'STAFF' } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_INVITATION_ROLE_CHANGED' }) });
  });

  it('allows only SUPER_ADMIN to invite an ORG_ADMIN', async () => {
    await expect(service.create('org-a', { id: 'org-admin', platformRole: 'MEMBER' }, { email: 'first-admin@example.com', role: 'ORG_ADMIN' as any })).rejects.toBeInstanceOf(ForbiddenException);
    expect(access.forOrganization).not.toHaveBeenCalled();

    tx.organization.findUnique.mockResolvedValue({ id: 'org-a', name: 'Org A', isActive: true });
    tx.user.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({ name: 'Root' });
    tx.organizationInvitation.findUnique.mockResolvedValue(null);
    tx.organizationInvitation.create.mockImplementation(({ data }: any) => ({ ...data, resendCount: 0 }));
    await expect(service.create('org-a', { id: 'root', platformRole: 'SUPER_ADMIN' }, { email: 'first-admin@example.com', role: 'ORG_ADMIN' as any })).resolves.toMatchObject({ role: 'ORG_ADMIN' });
  });

  it('prevents ORG_ADMIN from changing, resending or cancelling an administrator invitation', async () => {
    tx.organizationInvitation.findFirst.mockResolvedValue({ id: 'admin-invite', organizationId: 'org-a', role: 'ORG_ADMIN', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000) });
    await expect(service.cancel('org-a', 'admin-invite', { id: 'org-admin', platformRole: 'MEMBER' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.organizationInvitation.update).not.toHaveBeenCalled();
  });

  it('rejects an inactive organization before creating an invitation', async () => {
    tx.organization.findUnique.mockResolvedValue({ id: 'org-a', name: 'Org A', isActive: false });
    await expect(service.create('org-a', { id: 'root', platformRole: 'SUPER_ADMIN' }, { email: 'admin@example.com', role: 'ORG_ADMIN' as any })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it('does not resolve an invitation identifier from another organization', async () => {
    tx.organizationInvitation.findFirst.mockResolvedValue(null);
    await expect(service.updateRole('org-a', 'invite-from-org-b', 'STAFF', { id: 'admin-a' })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.organizationInvitation.findFirst).toHaveBeenCalledWith({ where: { id: 'invite-from-org-b', organizationId: 'org-a' } });
  });

  it('enforces the resend cooldown without creating another outbox item', async () => {
    tx.organizationInvitation.findFirst.mockResolvedValue({
      id: 'invite-1', organizationId: 'org-a', role: 'STAFF', status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000), lastSentAt: new Date(), resendCount: 0,
    });
    await expect(service.resend('org-a', 'invite-1', { id: 'admin' })).rejects.toMatchObject({ status: 429 });
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('reactivates an inactive membership only after a valid acceptance', async () => {
    const invitation = { id: 'invite-1', organizationId: 'org-a', email: 'guest@example.com', role: 'PRODUCER', status: 'PENDING', tokenHash: 'hash', activeKey: 'active', expiresAt: new Date(Date.now() + 60_000), organization: { id: 'org-a', name: 'Org A', slug: 'org-a', isActive: true } };
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation);
    tx.user.findFirst.mockResolvedValue({ id: 'guest' });
    tx.user.findUnique.mockResolvedValue({ id: 'guest', email: 'guest@example.com', isActive: true, isVerified: true });
    tx.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
    tx.organizationMember.findUnique.mockResolvedValue({ id: 'old-membership', status: 'INACTIVE', role: 'STAFF' });
    tx.organizationMember.update.mockResolvedValue({ id: 'old-membership', status: 'ACTIVE', role: 'PRODUCER' });
    await service.accept('invite-1.signature', { id: 'guest' });
    expect(tx.organizationMember.update).toHaveBeenCalledWith({ where: { id: 'old-membership' }, data: { role: 'PRODUCER', status: 'ACTIVE' } });
  });

  it.each(['ORG_ADMIN', 'PRODUCER', 'STAFF'] as const)('does not grant %s before email verification', async role => {
    const invitation = { id: 'invite-1', organizationId: 'org-a', email: 'guest@example.com', role, status: 'PENDING', tokenHash: 'hash', activeKey: 'active', expiresAt: new Date(Date.now() + 60_000), organization: { id: 'org-a', name: 'Org A', slug: 'org-a', isActive: true } };
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation);
    tx.user.findFirst.mockResolvedValue({ id: 'guest', isVerified: false });
    tx.user.findUnique.mockResolvedValue({ id: 'guest', email: 'guest@example.com', isActive: true, isVerified: false });
    await expect(service.accept('invite-1.signature', { id: 'guest' })).rejects.toThrow('Confirme seu e-mail');
    expect(tx.organizationInvitation.updateMany).not.toHaveBeenCalled();
    expect(tx.organizationMember.create).not.toHaveBeenCalled();
  });

  it('allows an existing unverified user to view the invitation state', async () => {
    tx.organizationInvitation.findUnique.mockResolvedValue({ id: 'invite-1', email: 'guest@example.com', role: 'STAFF', tokenHash: 'hash', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), organization: { name: 'Org A', isActive: true } });
    tx.user.findFirst.mockResolvedValue({ id: 'guest', isVerified: false });
    await expect(service.resolve('invite-1.signature')).resolves.toMatchObject({ hasAccount: true, accountVerified: false, role: 'STAFF' });
  });

  it('allows the same existing user to accept after verifying the email', async () => {
    const invitation = { id: 'invite-1', organizationId: 'org-a', email: 'guest@example.com', role: 'ORG_ADMIN', status: 'PENDING', tokenHash: 'hash', activeKey: 'active', expiresAt: new Date(Date.now() + 60_000), organization: { id: 'org-a', name: 'Org A', slug: 'org-a', isActive: true } };
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation);
    tx.user.findFirst.mockResolvedValue({ id: 'guest', isVerified: true });
    tx.user.findUnique.mockResolvedValue({ id: 'guest', email: 'guest@example.com', isActive: true, isVerified: true });
    tx.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
    tx.organizationMember.findUnique.mockResolvedValue(null);
    tx.organizationMember.create.mockResolvedValue({ id: 'membership-admin' });
    await expect(service.accept('invite-1.signature', { id: 'guest' })).resolves.toMatchObject({ role: 'ORG_ADMIN' });
    expect(tx.organizationMember.create).toHaveBeenCalledWith({ data: { organizationId: 'org-a', userId: 'guest', role: 'ORG_ADMIN', status: 'ACTIVE' } });
  });

  it.each(['CANCELLED', 'ACCEPTED', 'EXPIRED'] as const)('rejects a terminal %s invitation', async status => {
    tx.organizationInvitation.findUnique.mockResolvedValue({ id: 'invite-1', email: 'guest@example.com', tokenHash: 'hash', status, expiresAt: new Date(Date.now() + 60_000), organization: { isActive: true } });
    tx.user.findFirst.mockResolvedValue(null);
    await expect(service.resolve('invite-1.signature')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks a pending expired invitation and refuses reuse', async () => {
    tx.organizationInvitation.findUnique.mockResolvedValue({ id: 'invite-1', email: 'guest@example.com', tokenHash: 'hash', status: 'PENDING', expiresAt: new Date(Date.now() - 1), organization: { isActive: true } });
    tx.user.findFirst.mockResolvedValue(null);
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.resolve('invite-1.signature')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organizationInvitation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'invite-1', status: 'PENDING' }, data: expect.objectContaining({ status: 'EXPIRED', activeKey: null }) }));
  });
});
