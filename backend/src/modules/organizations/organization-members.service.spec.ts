import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationMembersService } from './organization-members.service';

describe('OrganizationMembersService', () => {
  let tx: any;
  let prisma: any;
  let access: any;
  let service: OrganizationMembersService;

  beforeEach(() => {
    tx = {
      organizationMember: {
        findFirst: jest.fn(), count: jest.fn(), update: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jest.fn((callback: any) => callback(tx)),
      organizationMember: { findMany: jest.fn(), count: jest.fn() },
    };
    access = {
      forOrganization: jest.fn().mockResolvedValue({ organizationMemberId: 'actor-membership' }),
    };
    service = new OrganizationMembersService(prisma, access);
  });

  it('lists only OrganizationMember records after MEMBERS_VIEW authorization', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([]);
    prisma.organizationMember.count.mockResolvedValue(0);
    const actor = { id: 'producer', platformRole: 'MEMBER' };
    await service.list('org-a', actor, { page: 1, limit: 20 });
    expect(access.forOrganization).toHaveBeenCalledWith(actor, 'org-a', 'MEMBERS_VIEW');
    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-a' },
    }));
  });

  it('centralizes member mutation authorization as MEMBERS_MANAGE', async () => {
    access.forOrganization.mockRejectedValue(new ForbiddenException());
    await expect(service.changeStatus('org-a', 'member-a', 'INACTIVE', { id: 'producer' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(access.forOrganization).toHaveBeenCalledWith(
      { id: 'producer' }, 'org-a', 'MEMBERS_MANAGE', tx,
    );
  });

  it('rejects cross-organization member identifiers', async () => {
    tx.organizationMember.findFirst.mockResolvedValue(null);
    await expect(service.changeRole('org-a', 'member-from-org-b', 'STAFF', { id: 'admin' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(tx.organizationMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'member-from-org-b', organizationId: 'org-a' },
    }));
  });

  it('allows only SUPER_ADMIN to grant ORG_ADMIN through role changes', async () => {
    expect(() => service.changeRole('org-a', 'producer-a', 'ORG_ADMIN', { id: 'org-admin', platformRole: 'MEMBER' })).toThrow(ForbiddenException);
    expect(access.forOrganization).not.toHaveBeenCalled();
  });

  it.each([
    ['role change', () => service.changeRole('org-a', 'last-admin', 'PRODUCER', { id: 'admin' })],
    ['deactivation', () => service.changeStatus('org-a', 'last-admin', 'INACTIVE', { id: 'admin' })],
    ['logical removal', () => service.deactivate('org-a', 'last-admin', { id: 'admin' })],
  ])('keeps at least one active ORG_ADMIN on %s', async (_label, operation) => {
    tx.organizationMember.findFirst.mockResolvedValue({ id: 'last-admin', userId: 'admin', role: 'ORG_ADMIN', status: 'ACTIVE' });
    tx.organizationMember.count.mockResolvedValue(1);
    await expect(operation()).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.organizationMember.update).not.toHaveBeenCalled();
  });

  it('removes logically, preserves membership and writes traceable audit data', async () => {
    tx.organizationMember.findFirst.mockResolvedValue({ id: 'member-a', userId: 'staff', role: 'STAFF', status: 'ACTIVE' });
    tx.organizationMember.update.mockResolvedValue({ id: 'member-a', role: 'STAFF', status: 'INACTIVE' });
    await service.deactivate('org-a', 'member-a', { id: 'admin' });
    expect(tx.organizationMember.update).toHaveBeenCalledWith({ where: { id: 'member-a' }, data: { status: 'INACTIVE' } });
    expect(tx.organizationMember.delete).toBeUndefined();
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'ORGANIZATION_MEMBER_REMOVED', entity: 'OrganizationMember', entityId: 'member-a',
      metadata: expect.objectContaining({ organizationId: 'org-a', requestedChange: { status: 'INACTIVE', removal: 'LOGICAL' } }),
    }) });
  });

  it('allows changing an admin when another active admin remains', async () => {
    tx.organizationMember.findFirst.mockResolvedValue({ id: 'admin-a', userId: 'a', role: 'ORG_ADMIN', status: 'ACTIVE' });
    tx.organizationMember.count.mockResolvedValue(2);
    tx.organizationMember.update.mockResolvedValue({ id: 'admin-a', role: 'PRODUCER', status: 'ACTIVE' });
    await expect(service.changeRole('org-a', 'admin-a', 'PRODUCER', { id: 'root', platformRole: 'SUPER_ADMIN' })).resolves.toMatchObject({ role: 'PRODUCER' });
  });
});
