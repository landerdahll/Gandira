import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const INITIAL_ORGANIZATION_SLUG = 'outrahora';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transitional resolver for Phase 1. It deliberately refuses to guess when a
   * user has more than one active organization. A later phase will supply the
   * active organization explicitly through the administrative context.
   */
  async resolveForEventCreation(userId: string) {
    const memberships = await (this.prisma as any).organizationMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        organization: { isActive: true },
      },
      select: {
        organizationId: true,
        role: true,
        organization: { select: { slug: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('Usuário não pertence a uma organização ativa');
    }
    if (memberships.length > 1) {
      throw new BadRequestException('Selecione uma organização ativa antes de criar o evento');
    }

    return memberships[0];
  }
}
