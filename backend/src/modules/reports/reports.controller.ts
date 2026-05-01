import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('dashboard')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiOperation({ summary: 'Dashboard do produtor' })
  dashboard(@CurrentUser() user: any) {
    return this.reports.getProducerDashboard(user.id);
  }

  @Get('events/:eventId')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiOperation({ summary: 'Relatório completo do evento' })
  eventReport(@Param('eventId') eventId: string, @CurrentUser() user: any) {
    return this.reports.getEventReport(eventId, user.id);
  }
}
