import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const prisma = { organizationMember: { findMany: jest.fn() }, organization: { findMany: jest.fn(), findFirst: jest.fn() } };
  const access = { forOrganization: jest.fn() };
  const service = new OrganizationsService(prisma as any, access as any);

  beforeEach(() => jest.clearAllMocks());

  it('resolves the sole active organization membership', async () => {
    const membership = { organizationId: 'org-1', role: 'PRODUCER', organization: { slug: 'outrahora' } };
    prisma.organizationMember.findMany.mockResolvedValue([membership]);

    await expect(service.resolveForEventCreation('user-1')).resolves.toEqual(membership);
    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE' }),
      take: 2,
    }));
  });

  it('rejects users without an active organization', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([]);
    await expect(service.resolveForEventCreation('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not silently choose between multiple organizations', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'org-1' },
      { organizationId: 'org-2' },
    ]);
    await expect(service.resolveForEventCreation('user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a single validated membership as active context with branding', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([{
      id: 'membership-1', role: 'PRODUCER',
      organization: { id: 'org-1', name: 'OutraHora', slug: 'outrahora', logoUrl: 'logo', primaryColor: '#111111', secondaryColor: '#ffffff', website: 'https://example.com', instagram: '@outrahora' },
    }]);
    await expect(service.getContext({ id: 'producer', platformRole: 'MEMBER' })).resolves.toMatchObject({
      selectionRequired: false,
      active: { organizationMemberId: 'membership-1', organizationRole: 'PRODUCER', organization: { website: 'https://example.com', instagram: '@outrahora' } },
    });
  });

  it('does not select an organization when multiple memberships exist', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([
      { id: 'membership-1', role: 'ORG_ADMIN', organization: { id: 'org-1' } },
      { id: 'membership-2', role: 'PRODUCER', organization: { id: 'org-2' } },
    ]);
    await expect(service.getContext({ id: 'member', platformRole: 'MEMBER' })).resolves.toMatchObject({ active: null, selectionRequired: true });
  });
});
