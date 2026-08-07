import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationMemberStatus, OrganizationRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { OrganizationAccessService } from './organization-access.service';
import { OrganizationActor } from './organization-access.types';
import { ListOrganizationMembersDto } from './dto/organization-members.dto';

@Injectable()
export class OrganizationMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: OrganizationAccessService,
  ) {}

  async list(organizationId: string, actor: OrganizationActor, query: ListOrganizationMembersDto) {
    await this.access.forOrganization(actor, organizationId, 'MEMBERS_VIEW');
    const where: Prisma.OrganizationMemberWhereInput = {
      organizationId,
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        user: {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      }),
    };
    const page = query.page || 1;
    const limit = query.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where,
        select: {
          id: true, role: true, status: true, createdAt: true, updatedAt: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.organizationMember.count({ where }),
    ]);
    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  changeRole(organizationId: string, memberId: string, role: OrganizationRole, actor: OrganizationActor) {
    if (role === 'ORG_ADMIN' && actor.platformRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Somente SUPER_ADMIN pode conceder o cargo ORG_ADMIN');
    }
    return this.mutate(organizationId, memberId, actor, 'ORGANIZATION_MEMBER_ROLE_CHANGED', async (tx, member) => {
      if (member.role === role) return member;
      await this.ensureActiveAdminRemains(tx, organizationId, member, { role });
      return tx.organizationMember.update({ where: { id: memberId }, data: { role } });
    }, { role });
  }

  changeStatus(organizationId: string, memberId: string, status: OrganizationMemberStatus, actor: OrganizationActor) {
    return this.mutate(organizationId, memberId, actor, 'ORGANIZATION_MEMBER_STATUS_CHANGED', async (tx, member) => {
      if (member.status === status) return member;
      await this.ensureActiveAdminRemains(tx, organizationId, member, { status });
      return tx.organizationMember.update({ where: { id: memberId }, data: { status } });
    }, { status });
  }

  deactivate(organizationId: string, memberId: string, actor: OrganizationActor) {
    return this.mutate(organizationId, memberId, actor, 'ORGANIZATION_MEMBER_REMOVED', async (tx, member) => {
      if (member.status === 'INACTIVE') return member;
      await this.ensureActiveAdminRemains(tx, organizationId, member, { status: 'INACTIVE' });
      return tx.organizationMember.update({ where: { id: memberId }, data: { status: 'INACTIVE' } });
    }, { status: 'INACTIVE', removal: 'LOGICAL' });
  }

  private mutate(
    organizationId: string,
    memberId: string,
    actor: OrganizationActor,
    action: string,
    operation: (tx: Prisma.TransactionClient, member: any) => Promise<any>,
    requestedChange: Record<string, unknown>,
  ) {
    return withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      const context = await this.access.forOrganization(actor, organizationId, 'MEMBERS_MANAGE', tx);
      const member = await tx.organizationMember.findFirst({
        where: { id: memberId, organizationId },
        select: { id: true, userId: true, role: true, status: true },
      });
      if (!member) throw new NotFoundException('Membro da organização não encontrado');
      const previous = { role: member.role, status: member.status };
      const updated = await operation(tx, member);
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action,
          entity: 'OrganizationMember',
          entityId: member.id,
          metadata: {
            organizationId,
            actorOrganizationMemberId: context.organizationMemberId,
            previous,
            requestedChange,
            result: { role: updated.role, status: updated.status },
          } as Prisma.InputJsonValue,
        },
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  private async ensureActiveAdminRemains(
    tx: Prisma.TransactionClient,
    organizationId: string,
    member: { role: OrganizationRole; status: OrganizationMemberStatus },
    next: { role?: OrganizationRole; status?: OrganizationMemberStatus },
  ) {
    const currentlyActiveAdmin = member.role === 'ORG_ADMIN' && member.status === 'ACTIVE';
    const remainsActiveAdmin = (next.role ?? member.role) === 'ORG_ADMIN' && (next.status ?? member.status) === 'ACTIVE';
    if (!currentlyActiveAdmin || remainsActiveAdmin) return;
    const activeAdmins = await tx.organizationMember.count({
      where: { organizationId, role: 'ORG_ADMIN', status: 'ACTIVE' },
    });
    if (activeAdmins <= 1) {
      throw new BadRequestException('A organização deve manter ao menos um ORG_ADMIN ativo');
    }
  }
}
