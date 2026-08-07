import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationAccessService } from './organization-access.service';

describe('OrganizationAccessService', () => {
  const prisma = {
    event: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    organizationMember: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const service = new OrganizationAccessService(prisma as any);
  const member = { id: 'user-1', platformRole: 'MEMBER' };

  beforeEach(() => jest.clearAllMocks());

  it('derives organization exclusively from the event and returns membership identity', async () => {
    prisma.event.findUnique.mockResolvedValue({ organizationId: 'org-a', organization: { isActive: true } });
    prisma.organizationMember.findUnique.mockResolvedValue({ id: 'membership-a', role: 'PRODUCER', status: 'ACTIVE' });

    await expect(service.forEvent(member, 'event-a', ['PRODUCER'])).resolves.toEqual({
      userId: 'user-1',
      platformRole: 'MEMBER',
      organizationId: 'org-a',
      organizationMemberId: 'membership-a',
      organizationRole: 'PRODUCER',
      isSuperAdmin: false,
    });
    expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId_userId: { organizationId: 'org-a', userId: 'user-1' } },
    }));
  });

  it('conceals an event from a member of another organization', async () => {
    prisma.event.findUnique.mockResolvedValue({ organizationId: 'org-b', organization: { isActive: true } });
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    await expect(service.forEvent(member, 'event-b', ['PRODUCER'])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects inactive memberships and insufficient organization roles', async () => {
    prisma.event.findUnique.mockResolvedValue({ organizationId: 'org-a', organization: { isActive: true } });
    prisma.organizationMember.findUnique.mockResolvedValue({ id: 'membership-a', role: 'STAFF', status: 'INACTIVE' });
    await expect(service.forEvent(member, 'event-a', ['STAFF'])).rejects.toBeInstanceOf(NotFoundException);

    prisma.organizationMember.findUnique.mockResolvedValue({ id: 'membership-a', role: 'STAFF', status: 'ACTIVE' });
    await expect(service.forEvent(member, 'event-a', ['PRODUCER'])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not choose implicitly between multiple memberships', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([
      { id: 'membership-a', organizationId: 'org-a', role: 'PRODUCER', status: 'ACTIVE' },
      { id: 'membership-b', organizationId: 'org-b', role: 'PRODUCER', status: 'ACTIVE' },
    ]);
    await expect(service.forCollection(member, ['PRODUCER'])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts an abstract explicit selection only after membership validation', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([
      { id: 'membership-b', organizationId: 'org-b', role: 'ORG_ADMIN', status: 'ACTIVE' },
    ]);
    const context = await service.forCollection(member, ['ORG_ADMIN'], { organizationId: 'org-b' });
    expect(context.organizationId).toBe('org-b');
    expect(context.organizationMemberId).toBe('membership-b');
    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org-b', userId: 'user-1' }),
    }));
  });

  it('rejects members without administrative membership', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([]);
    await expect(service.forCollection(member, ['PRODUCER'])).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('gives SUPER_ADMIN global context or a validated organization context', async () => {
    const superAdmin = { id: 'root', platformRole: 'SUPER_ADMIN' };
    await expect(service.forCollection(superAdmin, ['ORG_ADMIN'])).resolves.toMatchObject({
      organizationId: null,
      organizationMemberId: null,
      isSuperAdmin: true,
    });

    prisma.organization.findUnique.mockResolvedValue({ isActive: true });
    await expect(service.forCollection(superAdmin, ['ORG_ADMIN'], { organizationId: 'org-a' }))
      .resolves.toMatchObject({ organizationId: 'org-a', isSuperAdmin: true });
  });

  it('keeps organizational permissions in one role matrix', () => {
    expect(service.rolesFor('MEMBERS_VIEW')).toEqual(['ORG_ADMIN', 'PRODUCER']);
    expect(service.rolesFor('MEMBERS_MANAGE')).toEqual(['ORG_ADMIN']);
    expect(service.rolesFor('INVITATIONS_VIEW')).toEqual(['ORG_ADMIN']);
    expect(service.rolesFor('INVITATIONS_MANAGE')).toEqual(['ORG_ADMIN']);
    expect(service.rolesFor('TRANSFERS_VIEW')).toEqual(['ORG_ADMIN', 'PRODUCER']);
  });
});
