import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard platform roles', () => {
  function context(user: unknown) {
    return {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any;
  }

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
  };
  const guard = new RolesGuard(reflector as any);

  it('allows SUPER_ADMIN independently of the legacy role', () => {
    expect(guard.canActivate(context({ role: Role.CUSTOMER, platformRole: 'SUPER_ADMIN' }))).toBe(true);
  });

  it('keeps rejecting regular members without a required legacy role during transition', () => {
    expect(() => guard.canActivate(context({ role: Role.CUSTOMER, platformRole: 'MEMBER' })))
      .toThrow(ForbiddenException);
  });
});
