import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { EmailOutboxStatus, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmailOutboxService } from './email-outbox.service';

@Controller({ path: 'admin/email-outbox', version: '1' })
@Roles(Role.ADMIN)
export class EmailOutboxController {
  constructor(private readonly outbox: EmailOutboxService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: EmailOutboxStatus,
  ) { return this.outbox.adminList(page, limit, status); }
}
