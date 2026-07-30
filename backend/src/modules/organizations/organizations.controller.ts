import { Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationMembersService } from './organization-members.service';
import { OrganizationsService } from './organizations.service';
import { ListOrganizationMembersDto, UpdateOrganizationMemberRoleDto, UpdateOrganizationMemberStatusDto } from './dto/organization-members.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly members: OrganizationMembersService,
  ) {}

  @Get('context')
  @ApiOperation({ summary: 'Obter opções e contexto organizacional validado' })
  context(@CurrentUser() user: any) { return this.organizations.getContext(user); }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Visualizar dados e branding da organização' })
  detail(@Param('organizationId') organizationId: string, @CurrentUser() user: any) {
    return this.organizations.getDetail(organizationId, user);
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
}
