import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationAccessService } from './organization-access.service';
import { OrganizationActor } from './organization-access.types';

export const INITIAL_ORGANIZATION_SLUG = 'outrahora';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly access: OrganizationAccessService) {}

  async getContext(actor: OrganizationActor) {
    if (actor.platformRole === 'SUPER_ADMIN') {
      const organizations = await this.prisma.organization.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true, slug: true, logoUrl: true, primaryColor: true,
          secondaryColor: true, website: true, instagram: true,
        },
        orderBy: { name: 'asc' },
      });
      return {
        active: organizations.length === 1 ? {
          organizationMemberId: null,
          organizationRole: null,
          organization: organizations[0],
        } : null,
        selectionRequired: organizations.length !== 1,
        isSuperAdmin: true,
        organizations,
      };
    }
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: actor.id, status: 'ACTIVE', organization: { isActive: true } },
      select: {
        id: true, role: true,
        organization: { select: {
          id: true, name: true, slug: true, logoUrl: true, primaryColor: true,
          secondaryColor: true, website: true, instagram: true,
        } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const options = memberships.map((membership) => ({
      organizationMemberId: membership.id,
      organizationRole: membership.role,
      organization: membership.organization,
    }));
    return {
      active: options.length === 1 ? options[0] : null,
      selectionRequired: options.length > 1,
      isSuperAdmin: false,
      organizations: options,
    };
  }

  async getDetail(organizationId: string, actor: OrganizationActor) {
    const context = await this.access.forOrganization(actor, organizationId, 'ORGANIZATION_VIEW');
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, isActive: true },
      select: {
        id: true, name: true, slug: true, logoUrl: true, primaryColor: true,
        secondaryColor: true, website: true, instagram: true, isActive: true,
      },
    });
    if (!organization) throw new NotFoundException('Organização não encontrada');
    return { organization, access: context };
  }

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
