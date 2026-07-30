import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TEST_MEMBER_EMAILS, UsersService } from './users.service';

describe('UsersService.getProfile', () => {
  const user = {
    id: 'user-1', email: ' Member@Example.com ', name: 'Maria', phone: null,
    role: 'CUSTOMER', gender: null, birthDate: null, avatarUrl: null,
    isVerified: true, createdAt: new Date('2026-01-01T00:00:00.000Z'),
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
      clubMembership: { isMember: true, isActive: true, canUseBenefit: true, discountPercentage: '15.75', label: 'Clube Outrahora' },
    }));
  });

  it('normaliza espaços e caixa do e-mail antes de procurar o membro', async () => {
    const { service, prisma } = setup({ isActive: true, discountPercentage: new Prisma.Decimal('10') });
    await service.getProfile(user.id);
    expect(prisma.clubMember.findUnique).toHaveBeenCalledWith({
      where: { email: 'member@example.com' }, select: { isActive: true, discountPercentage: true },
    });
  });

  it('mantém estrutura estável para membro inativo', async () => {
    const { service } = setup({ isActive: false, discountPercentage: new Prisma.Decimal('12.50') });
    const result = await service.getProfile(user.id);
    expect(result.clubMembership).toEqual({
      isMember: true, isActive: false, canUseBenefit: false, discountPercentage: '12.50', label: 'Clube Outrahora',
    });
  });

  it('mantém estrutura estável para não membro', async () => {
    const { service } = setup(null);
    const result = await service.getProfile(user.id);
    expect(result.clubMembership).toEqual({
      isMember: false, isActive: false, canUseBenefit: false, discountPercentage: null, label: 'Clube Outrahora',
    });
  });

  it('não consulta membro quando o usuário não existe', async () => {
    const { service, prisma } = setup(null);
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clubMember.findUnique).not.toHaveBeenCalled();
  });
});

function emptyStore(overrides: Record<string, jest.Mock> = {}) {
  return new Proxy(overrides, {
    get(target, property: string) {
      if (!target[property]) {
        target[property] = jest.fn(async () => property === 'count' ? 0 : property === 'deleteMany' ? { count: 0 } : []);
      }
      return target[property];
    },
  });
}

function prismaWithUsers(users: any[], protectedUser: any = { id: 'protected', email: 'teste@teste.com', name: 'Teste Usuario' }) {
  const tx: any = new Proxy({}, {
    get(target: any, model: string) {
      if (!target[model]) target[model] = emptyStore();
      return target[model];
    },
  });
  tx.user = emptyStore({
    findMany: jest.fn(async () => users),
    findFirst: jest.fn(async () => protectedUser),
    count: jest.fn(async () => 0),
    deleteMany: jest.fn(async () => ({ count: users.length })),
  });
  const prisma: any = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
  return { service: new UsersService(prisma), tx };
}

describe('UsersService test-member purge', () => {
  it('uses an exact allowlist that cannot include Teste Usuario', () => {
    expect(TEST_MEMBER_EMAILS).toEqual([
      'will3@gmail.com', 'will2@gmail.com', 'leozinvasquez@gmail.com',
      'cliente@gandira.com', 'camila.teste@outrahora.com', 'cliente@outrahora.com',
    ]);
    expect(TEST_MEMBER_EMAILS).not.toContain('teste@teste.com');
  });

  it('is idempotent when targets are already absent and preserves Teste Usuario', async () => {
    const { service, tx } = prismaWithUsers([]);
    const result = await service.purgeTestMembers();

    expect(result.removedUsers).toEqual([]);
    expect(result.missingEmails).toEqual(TEST_MEMBER_EMAILS);
    expect(result.protectedUser).toEqual({ id: 'protected', email: 'teste@teste.com', name: 'Teste Usuario' });
    expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [] } } });
    expect(Object.values(result.integrity).every((count) => count === 0)).toBe(true);
  });

  it('aborts before deletion if any target owns an event', async () => {
    const { service, tx } = prismaWithUsers([{ id: 'producer', email: 'will3@gmail.com', name: 'will3', events: [{ id: 'event' }] }]);

    await expect(service.purgeTestMembers()).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
  });
});
