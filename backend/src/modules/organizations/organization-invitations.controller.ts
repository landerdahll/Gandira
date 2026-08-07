import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AcceptOrganizationInvitationDto } from './dto/organization-invitations.dto';
import { OrganizationInvitationsService } from './organization-invitations.service';

@ApiTags('Organization invitations')
@Controller({ path: 'organization-invitations', version: '1' })
export class OrganizationInvitationsController {
  constructor(private readonly invitations: OrganizationInvitationsService) {}

  @Public()
  @Post('resolve')
  @ApiOperation({ summary: 'Validar e apresentar um convite de organização' })
  resolve(@Body() dto: AcceptOrganizationInvitationDto) {
    return this.invitations.resolve(dto.token);
  }

  @Post('accept')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceitar um convite com o mesmo e-mail da conta autenticada' })
  accept(@Body() dto: AcceptOrganizationInvitationDto, @CurrentUser() user: any) {
    return this.invitations.accept(dto.token, user);
  }
}
