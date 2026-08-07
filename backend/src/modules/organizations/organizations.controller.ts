import { Controller, Delete, Get, Param, Patch, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationMembersService } from './organization-members.service';
import { OrganizationsService } from './organizations.service';
import { ListOrganizationMembersDto, UpdateOrganizationMemberRoleDto, UpdateOrganizationMemberStatusDto } from './dto/organization-members.dto';
import { CreateOrganizationInvitationDto, ListOrganizationInvitationsDto, UpdateOrganizationInvitationRoleDto } from './dto/organization-invitations.dto';
import { OrganizationInvitationsService } from './organization-invitations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/manage-organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly members: OrganizationMembersService,
    private readonly invitations: OrganizationInvitationsService,
  ) {}

  @Get('context')
  @ApiOperation({ summary: 'Obter opções e contexto organizacional validado' })
  context(@CurrentUser() user: any) { return this.organizations.getContext(user); }

  @Get()
  @ApiOperation({ summary: 'Listar organizações para administração global' })
  adminList(@CurrentUser() user: any) { return this.organizations.adminList(user); }

  @Post()
  @ApiOperation({ summary: 'Criar organização como SUPER_ADMIN' })
  createOrganization(@Body() dto: CreateOrganizationDto, @CurrentUser() user: any) { return this.organizations.create(dto, user); }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Visualizar dados e branding da organização' })
  detail(@Param('organizationId') organizationId: string, @CurrentUser() user: any) {
    return this.organizations.getDetail(organizationId, user);
  }

  @Patch(':organizationId')
  @ApiOperation({ summary: 'Atualizar organização como SUPER_ADMIN' })
  updateOrganization(@Param('organizationId') organizationId: string, @Body() dto: UpdateOrganizationDto, @CurrentUser() user: any) {
    return this.organizations.update(organizationId, dto, user);
  }

  @Get(':organizationId/members')
  @ApiOperation({ summary: 'Listar equipe da organização' })
  listMembers(@Param('organizationId') organizationId: string, @Query() query: ListOrganizationMembersDto, @CurrentUser() user: any) {
    return this.members.list(organizationId, user, query);
  }

  @Patch(':organizationId/members/:memberId/role')
  changeRole(@Param('organizationId') organizationId: string, @Param('memberId') memberId: string, @Body() dto: UpdateOrganizationMemberRoleDto, @CurrentUser() user: any) {
    return this.members.changeRole(organizationId, memberId, dto.role, user);
  }

  @Patch(':organizationId/members/:memberId/status')
  changeStatus(@Param('organizationId') organizationId: string, @Param('memberId') memberId: string, @Body() dto: UpdateOrganizationMemberStatusDto, @CurrentUser() user: any) {
    return this.members.changeStatus(organizationId, memberId, dto.status, user);
  }

  @Delete(':organizationId/members/:memberId')
  @ApiOperation({ summary: 'Remover logicamente membro da organização' })
  deactivate(@Param('organizationId') organizationId: string, @Param('memberId') memberId: string, @CurrentUser() user: any) {
    return this.members.deactivate(organizationId, memberId, user);
  }

  @Post(':organizationId/invitations')
  createInvitation(@Param('organizationId') organizationId: string, @Body() dto: CreateOrganizationInvitationDto, @CurrentUser() user: any) {
    return this.invitations.create(organizationId, user, dto);
  }

  @Get(':organizationId/invitations')
  listInvitations(@Param('organizationId') organizationId: string, @Query() query: ListOrganizationInvitationsDto, @CurrentUser() user: any) {
    return this.invitations.list(organizationId, user, query.status);
  }

  @Patch(':organizationId/invitations/:invitationId/role')
  updateInvitationRole(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @Body() dto: UpdateOrganizationInvitationRoleDto, @CurrentUser() user: any) {
    return this.invitations.updateRole(organizationId, invitationId, dto.role, user);
  }

  @Post(':organizationId/invitations/:invitationId/resend')
  resendInvitation(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @CurrentUser() user: any) {
    return this.invitations.resend(organizationId, invitationId, user);
  }

  @Post(':organizationId/invitations/:invitationId/cancel')
  cancelInvitation(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @CurrentUser() user: any) {
    return this.invitations.cancel(organizationId, invitationId, user);
  }
}
