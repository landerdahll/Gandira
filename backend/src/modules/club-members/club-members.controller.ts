import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClubMembersService } from './club-members.service';
import { CreateClubMemberDto } from './dto/create-club-member.dto';

@ApiTags('Clube Outrahora')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller({ path: 'admin/club-members', version: '1' })
export class ClubMembersController {
  constructor(private readonly clubMembers: ClubMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar e pesquisar membros do Clube Outrahora' })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.clubMembers.list(page, limit, search);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar membro no Clube Outrahora' })
  create(@Body() dto: CreateClubMemberDto, @CurrentUser() admin: { id: string }) {
    return this.clubMembers.create(dto, admin.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar membro do Clube Outrahora' })
  findOne(@Param('id') id: string) {
    return this.clubMembers.findOne(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativar membro do Clube Outrahora' })
  activate(@Param('id') id: string, @CurrentUser() admin: { id: string }) {
    return this.clubMembers.activate(id, admin.id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativar membro do Clube Outrahora' })
  deactivate(@Param('id') id: string, @CurrentUser() admin: { id: string }) {
    return this.clubMembers.deactivate(id, admin.id);
  }
}
