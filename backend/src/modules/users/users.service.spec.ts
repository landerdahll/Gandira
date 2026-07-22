import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService.getProfile', () => {
  const user = {
    id: 'user-1',
    email: ' Member@Example.com ',
    name: 'Maria',
    phone: null,
    role: 'CUSTOMER',
    gender: null,
    birthDate: null,
    avatarUrl: null,
    isVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  function setup(clubMember: { isActive: boolean; discountPercentage: Prisma.Decimal } | null) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      clubMember: { findUnique: jest.fn().mockResolvedValue(clubMember) },
    };
    return { service: new UsersService(prisma as never), prisma };
  }

  it('retorna membro ativo, apto e percentual como string decimal', async () => {
    const { service } = setup({ isActive: true, discountPercentage: new Prisma.Decimal('15.75') });

    await expect(service.getProfile(user.id)).resolves.toEqual(expect.objectContaining({
      clubMembership: {
        isMember: true,
        isActive: true,
        canUseBenefit: true,
        discountPercentage: '15.75',
        label: 'Clube Outrahora',
      },
    }));
  });

  it('normaliza espaços e caixa do e-mail antes de procurar o membro', async () => {
    const { service, prisma } = setup({ isActive: true, discountPercentage: new Prisma.Decimal('10') });
    await service.getProfile(user.id);
    expect(prisma.clubMember.findUnique).toHaveBeenCalledWith({
      where: { email: 'member@example.com' },
      select: { isActive: true, discountPercentage: true },
    });
  });

  it('mantém estrutura estável para membro inativo', async () => {
    const { service } = setup({ isActive: false, discountPercentage: new Prisma.Decimal('12.50') });
    const result = await service.getProfile(user.id);
    expect(result.clubMembership).toEqual({
      isMember: true,
      isActive: false,
      canUseBenefit: false,
      discountPercentage: '12.50',
      label: 'Clube Outrahora',
    });
  });

  it('mantém estrutura estável para não membro', async () => {
    const { service } = setup(null);
    const result = await service.getProfile(user.id);
    expect(result.clubMembership).toEqual({
      isMember: false,
      isActive: false,
      canUseBenefit: false,
      discountPercentage: null,
      label: 'Clube Outrahora',
    });
  });

  it('não consulta membro quando o usuário não existe', async () => {
    const { service, prisma } = setup(null);
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clubMember.findUnique).not.toHaveBeenCalled();
  });
});
