import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationInvitationRole, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { EmailOutboxService } from '../mail/email-outbox.service';
import { EmailTokenService } from '../mail/email-token.service';
import { OrganizationAccessService } from './organization-access.service';
import { OrganizationActor } from './organization-access.types';

const INVITATION_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

@Injectable()
export class OrganizationInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: OrganizationAccessService,
    private readonly outbox: EmailOutboxService,
    private readonly tokens: EmailTokenService,
  ) {}

  create(organizationId: string, actor: OrganizationActor, input: { email: string; role: OrganizationInvitationRole; customMessage?: string }) {
    return withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      const context = await this.access.forOrganization(actor, organizationId, 'INVITATIONS_MANAGE', tx);
      const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, isActive: true } });
      if (!organization?.isActive) throw new NotFoundException('Organização não encontrada');
      const email = this.normalizeEmail(input.email);
      await this.expirePending(tx, { organizationId, email });
      const user = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
      if (user) {
        const activeMembership = await tx.organizationMember.findFirst({ where: { organizationId, userId: user.id, status: 'ACTIVE' }, select: { id: true } });
        if (activeMembership) throw new ConflictException('Este usuário já faz parte da organização');
      }
      const duplicate = await tx.organizationInvitation.findUnique({ where: { activeKey: this.activeKey(organizationId, email) }, select: { id: true } });
      if (duplicate) throw new ConflictException('Já existe um convite pendente para este e-mail');

      const inviter = await tx.user.findUnique({ where: { id: actor.id }, select: { name: true } });
      const id = randomUUID();
      const now = new Date();
      const invitation = await tx.organizationInvitation.create({ data: {
        id, organizationId, email, role: input.role,
        customMessage: input.customMessage?.trim() || null,
        status: 'PENDING', tokenHash: this.tokens.hashForRecord(id, 'organization-invite'),
        activeKey: this.activeKey(organizationId, email), invitedByUserId: actor.id,
        expiresAt: new Date(now.getTime() + INVITATION_VALIDITY_MS), lastSentAt: now,
      } });
      await this.enqueue(tx, invitation, organization.name, inviter?.name?.trim() || organization.name, 1);
      await tx.auditLog.create({ data: { userId: actor.id, action: 'ORGANIZATION_INVITATION_CREATED', entity: 'OrganizationInvitation', entityId: id, metadata: {
        organizationId, actorOrganizationMemberId: context.organizationMemberId, role: input.role, email,
      } as Prisma.InputJsonValue } });
      return invitation;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })).catch(this.mapUniqueConflict);
  }

  async list(organizationId: string, actor: OrganizationActor, status?: any) {
    await this.access.forOrganization(actor, organizationId, 'INVITATIONS_VIEW');
    await this.prisma.$transaction(tx => this.expirePending(tx, { organizationId }));
    const invitations = await this.prisma.organizationInvitation.findMany({
      where: { organizationId, ...(status && { status }) },
      include: { invitedBy: { select: { id: true, name: true } }, acceptedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const emails = [...new Set(invitations.map(item => item.email))];
    const users = emails.length ? await this.prisma.user.findMany({ where: { email: { in: emails, mode: 'insensitive' } }, select: { email: true, name: true } }) : [];
    const names = new Map(users.map(user => [this.normalizeEmail(user.email), user.name]));
    return invitations.map(invitation => ({ ...invitation, tokenHash: undefined, activeKey: undefined, accountName: names.get(invitation.email) || null }));
  }

  updateRole(organizationId: string, invitationId: string, role: OrganizationInvitationRole, actor: OrganizationActor) {
    return this.mutatePending(organizationId, invitationId, actor, 'ORGANIZATION_INVITATION_ROLE_CHANGED', async (tx, invitation) => {
      if (invitation.role === role) return invitation;
      const updated = await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { role } });
      const queued = await tx.emailOutbox.findMany({ where: { relatedEntityType: 'OrganizationInvitation', relatedEntityId: invitation.id, status: { in: ['PENDING', 'RETRY'] } }, select: { id: true, payload: true } });
      for (const item of queued) {
        await tx.emailOutbox.update({ where: { id: item.id }, data: { payload: { ...(item.payload as Record<string, unknown>), role } as Prisma.InputJsonValue } });
      }
      return updated;
    }, { role });
  }

  cancel(organizationId: string, invitationId: string, actor: OrganizationActor) {
    return this.mutatePending(organizationId, invitationId, actor, 'ORGANIZATION_INVITATION_CANCELLED', (tx, invitation) =>
      tx.organizationInvitation.update({ where: { id: invitation.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), activeKey: null } }), {});
  }

  resend(organizationId: string, invitationId: string, actor: OrganizationActor) {
    return this.mutatePending(organizationId, invitationId, actor, 'ORGANIZATION_INVITATION_RESENT', async (tx, invitation) => {
      if (Date.now() - invitation.lastSentAt.getTime() < RESEND_COOLDOWN_MS) throw new HttpException('Aguarde 5 minutos antes de reenviar o convite', HttpStatus.TOO_MANY_REQUESTS);
      if (invitation.resendCount >= 10) throw new BadRequestException('O limite de reenvios deste convite foi atingido');
      const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } });
      const inviter = await tx.user.findUnique({ where: { id: invitation.invitedByUserId }, select: { name: true } });
      const sendNumber = invitation.resendCount + 2;
      const updated = await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { lastSentAt: new Date(), resendCount: { increment: 1 } } });
      await this.enqueue(tx, updated, organization.name, inviter?.name?.trim() || organization.name, sendNumber);
      return updated;
    }, {});
  }

  async resolve(token: string) {
    const invitation = await this.findByToken(token);
    if (invitation.status !== 'PENDING') throw new BadRequestException(this.invalidStatusMessage(invitation.status));
    if (invitation.expiresAt <= new Date()) {
      await this.markExpired(invitation.id);
      throw new BadRequestException('Este convite expirou');
    }
    if (!invitation.organization.isActive) throw new BadRequestException('A organização não está ativa');
    return { organizationName: invitation.organization.name, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt, hasAccount: Boolean(invitation.user) };
  }

  async accept(token: string, actor: OrganizationActor & { email?: string }) {
    const result: any = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      const invitation = await this.findByToken(token, tx);
      if (invitation.status !== 'PENDING') throw new BadRequestException(this.invalidStatusMessage(invitation.status));
      if (invitation.expiresAt <= new Date()) {
        await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED', expiredAt: new Date(), activeKey: null } });
        return { expired: true };
      }
      const user = await tx.user.findUnique({ where: { id: actor.id }, select: { id: true, email: true, isActive: true } });
      if (!user?.isActive) throw new ForbiddenException('Usuário inválido para aceitar o convite');
      if (this.normalizeEmail(user.email) !== invitation.email) throw new ForbiddenException('Este convite pertence a outro e-mail');
      if (!invitation.organization.isActive) throw new BadRequestException('A organização não está ativa');

      const claimed = await tx.organizationInvitation.updateMany({ where: { id: invitation.id, status: 'PENDING', activeKey: { not: null } }, data: {
        status: 'ACCEPTED', acceptedByUserId: user.id, acceptedAt: new Date(), activeKey: null,
      } });
      if (claimed.count !== 1) throw new ConflictException('Este convite já foi utilizado');
      const existing = await tx.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: invitation.organizationId, userId: user.id } } });
      if (existing?.status === 'ACTIVE') throw new ConflictException('Este usuário já faz parte da organização');
      const membership = existing
        ? await tx.organizationMember.update({ where: { id: existing.id }, data: { role: invitation.role, status: 'ACTIVE' } })
        : await tx.organizationMember.create({ data: { organizationId: invitation.organizationId, userId: user.id, role: invitation.role, status: 'ACTIVE' } });
      await tx.auditLog.create({ data: { userId: user.id, action: 'ORGANIZATION_INVITATION_ACCEPTED', entity: 'OrganizationInvitation', entityId: invitation.id, metadata: {
        organizationId: invitation.organizationId, membershipId: membership.id, role: invitation.role, membershipAction: existing ? 'REACTIVATED' : 'CREATED',
      } as Prisma.InputJsonValue } });
      return { organization: { id: invitation.organization.id, name: invitation.organization.name, slug: invitation.organization.slug }, role: invitation.role };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    if (result.expired) throw new BadRequestException('Este convite expirou');
    return result;
  }

  private async mutatePending(organizationId: string, invitationId: string, actor: OrganizationActor, action: string, operation: (tx: Prisma.TransactionClient, invitation: any) => Promise<any>, change: Record<string, unknown>) {
    const result: any = await withSerializableRetry(() => this.prisma.$transaction(async tx => {
      const context = await this.access.forOrganization(actor, organizationId, 'INVITATIONS_MANAGE', tx);
      const invitation = await tx.organizationInvitation.findFirst({ where: { id: invitationId, organizationId } });
      if (!invitation) throw new NotFoundException('Convite não encontrado');
      if (invitation.status !== 'PENDING') throw new BadRequestException(this.invalidStatusMessage(invitation.status));
      if (invitation.expiresAt <= new Date()) {
        await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED', expiredAt: new Date(), activeKey: null } });
        return { expired: true };
      }
      const result = await operation(tx, invitation);
      await tx.auditLog.create({ data: { userId: actor.id, action, entity: 'OrganizationInvitation', entityId: invitation.id, metadata: {
        organizationId, actorOrganizationMemberId: context.organizationMemberId, previousRole: invitation.role, ...change,
      } as Prisma.InputJsonValue } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    if (result.expired) throw new BadRequestException('Este convite expirou');
    return result;
  }

  private async enqueue(tx: Prisma.TransactionClient, invitation: any, organizationName: string, inviterName: string, sendNumber: number) {
    await this.outbox.enqueue({
      type: 'ORGANIZATION_INVITATION', recipient: invitation.email, template: 'ORGANIZATION_INVITATION',
      payload: { organizationName, inviterName, role: invitation.role, customMessage: invitation.customMessage,
        tokenRecordId: invitation.id, tokenPurpose: 'organization-invite', tokenPath: '/organization-invitations/accept' },
      idempotencyKey: `ORGANIZATION_INVITATION:${invitation.id}:send:${sendNumber}`,
      relatedEntityType: 'OrganizationInvitation', relatedEntityId: invitation.id,
    }, tx);
  }

  private async findByToken(token: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    const id = token.split('.', 1)[0];
    if (!id) throw new BadRequestException('Convite inválido');
    const invitation = await db.organizationInvitation.findUnique({ where: { id }, include: {
      organization: { select: { id: true, name: true, slug: true, isActive: true } },
    } });
    if (!invitation || !this.tokens.matches(token, invitation.tokenHash)) throw new BadRequestException('Convite inválido');
    const user = await db.user.findFirst({ where: { email: { equals: invitation.email, mode: 'insensitive' } }, select: { id: true } });
    return { ...invitation, user };
  }

  private expirePending(tx: Prisma.TransactionClient, where: { organizationId: string; email?: string }) {
    return tx.organizationInvitation.updateMany({ where: { ...where, status: 'PENDING', expiresAt: { lte: new Date() } }, data: { status: 'EXPIRED', expiredAt: new Date(), activeKey: null } });
  }
  private markExpired(id: string) { return this.prisma.organizationInvitation.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'EXPIRED', expiredAt: new Date(), activeKey: null } }); }
  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private activeKey(organizationId: string, email: string) { return `${organizationId}:${email}`; }
  private invalidStatusMessage(status: string) { return status === 'ACCEPTED' ? 'Este convite já foi aceito' : status === 'CANCELLED' ? 'Este convite foi cancelado' : status === 'EXPIRED' ? 'Este convite expirou' : 'Convite inválido'; }
  private mapUniqueConflict(error: any) {
    if (error?.code === 'P2002') throw new ConflictException('Já existe um convite pendente para este e-mail');
    throw error;
  }
}
