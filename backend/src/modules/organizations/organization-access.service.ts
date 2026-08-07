import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrganizationAccessContext,
  OrganizationActor,
  OrganizationPermission,
  OrganizationRoleName,
  OrganizationSelection,
} from './organization-access.types';

type DatabaseClient = PrismaService | Prisma.TransactionClient | PrismaClient;

const ORGANIZATION_PERMISSION_ROLES: Record<OrganizationPermission, readonly OrganizationRoleName[]> = {
  ORGANIZATION_VIEW: ['ORG_ADMIN', 'PRODUCER', 'STAFF'],
  MEMBERS_VIEW: ['ORG_ADMIN', 'PRODUCER'],
  MEMBERS_MANAGE: ['ORG_ADMIN'],
  INVITATIONS_VIEW: ['ORG_ADMIN'],
  INVITATIONS_MANAGE: ['ORG_ADMIN'],
  TRANSFERS_VIEW: ['ORG_ADMIN', 'PRODUCER'],
  EVENTS_MANAGE: ['ORG_ADMIN', 'PRODUCER'],
  REPORTS_VIEW: ['ORG_ADMIN', 'PRODUCER'],
  CHECK_IN_MANAGE: ['ORG_ADMIN', 'PRODUCER', 'STAFF'],
  SALES_VIEW: ['ORG_ADMIN', 'PRODUCER'],
};

@Injectable()
export class OrganizationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  rolesFor(permission: OrganizationPermission): readonly OrganizationRoleName[] {
    return ORGANIZATION_PERMISSION_ROLES[permission];
  }

  forOrganization(
    actor: OrganizationActor,
    organizationId: string,
    permission: OrganizationPermission,
    database: DatabaseClient = this.prisma,
  ) {
    return this.forCollection(actor, this.rolesFor(permission), { organizationId }, database);
  }

  forCollectionPermission(
    actor: OrganizationActor,
    permission: OrganizationPermission,
    selection: OrganizationSelection = {},
    database: DatabaseClient = this.prisma,
  ) {
    return this.forCollection(actor, this.rolesFor(permission), selection, database);
  }

  forEventPermission(
    actor: OrganizationActor,
    eventId: string,
    permission: OrganizationPermission,
    database: DatabaseClient = this.prisma,
  ) {
    return this.forEvent(actor, eventId, this.rolesFor(permission), database);
  }

  /**
   * Event.organizationId is the sole ownership source. When an eventId exists,
   * client-provided organization selection is deliberately ignored.
   */
  async forEvent(
    actor: OrganizationActor,
    eventId: string,
    allowedRoles: readonly OrganizationRoleName[],
    database: DatabaseClient = this.prisma,
  ): Promise<OrganizationAccessContext> {
    const db = database as any;
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        organizationId: true,
        organization: { select: { isActive: true } },
      },
    });

    // Do not disclose whether a resource exists in another/inactive tenant.
    if (!event || !event.organization?.isActive) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (actor.platformRole === 'SUPER_ADMIN') {
      return this.superAdminContext(actor.id, event.organizationId);
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: event.organizationId,
          userId: actor.id,
        },
      },
      select: { id: true, role: true, status: true },
    });

    if (!membership || membership.status !== 'ACTIVE' || !allowedRoles.includes(membership.role)) {
      throw new NotFoundException('Evento não encontrado');
    }

    return this.membershipContext(actor.id, event.organizationId, membership);
  }

  async forCollection(
    actor: OrganizationActor,
    allowedRoles: readonly OrganizationRoleName[],
    selection: OrganizationSelection = {},
    database: DatabaseClient = this.prisma,
  ): Promise<OrganizationAccessContext> {
    const db = database as any;
    const selectedOrganizationId = selection.organizationId || null;

    if (actor.platformRole === 'SUPER_ADMIN') {
      if (selectedOrganizationId) {
        const organization = await db.organization.findUnique({
          where: { id: selectedOrganizationId },
          select: { isActive: true },
        });
        if (!organization?.isActive) throw new NotFoundException('Organização não encontrada');
      }
      return this.superAdminContext(actor.id, selectedOrganizationId);
    }

    const memberships = await db.organizationMember.findMany({
      where: {
        userId: actor.id,
        status: 'ACTIVE',
        organization: { isActive: true },
        ...(selectedOrganizationId && { organizationId: selectedOrganizationId }),
      },
      select: { id: true, organizationId: true, role: true, status: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    if (memberships.length === 0) throw new ForbiddenException('Acesso administrativo negado');
    if (!selectedOrganizationId && memberships.length > 1) {
      throw new BadRequestException('Selecione uma organização ativa');
    }

    const membership = memberships[0];
    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Cargo sem permissão para esta operação');
    }

    return this.membershipContext(actor.id, membership.organizationId, membership);
  }

  eventOrganizationWhere(context: OrganizationAccessContext): any {
    return context.isSuperAdmin && !context.organizationId
      ? {}
      : { organizationId: context.organizationId! };
  }

  private superAdminContext(userId: string, organizationId: string | null): OrganizationAccessContext {
    return {
      userId,
      platformRole: 'SUPER_ADMIN',
      organizationId,
      organizationMemberId: null,
      organizationRole: null,
      isSuperAdmin: true,
    };
  }

  private membershipContext(userId: string, organizationId: string, membership: any): OrganizationAccessContext {
    return {
      userId,
      platformRole: 'MEMBER',
      organizationId,
      organizationMemberId: membership.id,
      organizationRole: membership.role,
      isSuperAdmin: false,
    };
  }
}
