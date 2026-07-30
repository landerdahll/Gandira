import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const prisma = { organizationMember: { findMany: jest.fn() } };
  const service = new OrganizationsService(prisma as any);

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
});
