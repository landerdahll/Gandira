import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationAccessService } from './organization-access.service';
import { OrganizationActor } from './organization-access.types';
import { Prisma } from '@prisma/client';
import { slugify } from '../../common/utils/crypto.util';

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

  async adminList(actor: OrganizationActor) {
    this.ensureSuperAdmin(actor);
    return this.prisma.organization.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { members: true, events: true, invitations: true } } } });
  }

  async create(input: { name: string; slug?: string; logoUrl?: string; primaryColor?: string; secondaryColor?: string; website?: string; instagram?: string }, actor: OrganizationActor) {
    this.ensureSuperAdmin(actor);
    const slug = input.slug || slugify(input.name);
    try {
      return await this.prisma.$transaction(async tx => {
        const organization = await tx.organization.create({ data: { ...input, slug } });
        await tx.auditLog.create({ data: { userId: actor.id, action: 'ORGANIZATION_CREATED', entity: 'Organization', entityId: organization.id, metadata: { slug } as Prisma.InputJsonValue } });
        return organization;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('Já existe uma organização com este slug');
      throw error;
    }
  }

  async update(organizationId: string, input: any, actor: OrganizationActor) {
    this.ensureSuperAdmin(actor);
    return this.prisma.$transaction(async tx => {
      const current = await tx.organization.findUnique({ where: { id: organizationId } });
      if (!current) throw new NotFoundException('Organização não encontrada');
      const organization = await tx.organization.update({ where: { id: organizationId }, data: input });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'ORGANIZATION_UPDATED', entity: 'Organization', entityId: organizationId, metadata: { changes: input } as Prisma.InputJsonValue } });
      return organization;
    });
  }

  private ensureSuperAdmin(actor: OrganizationActor) {
    if (actor.platformRole !== 'SUPER_ADMIN') throw new ForbiddenException('Apenas SUPER_ADMIN pode gerenciar organizações');
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
