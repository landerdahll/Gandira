import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { TicketsService } from '../tickets/tickets.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiProperty } from '@nestjs/swagger';

class ScanDto {
  @ApiProperty({ description: 'Token extraído do QR Code' })
  @IsString()
  token: string;
}

@ApiTags('Check-in')
@ApiBearerAuth()
@Controller({ path: 'events/:eventId/checkin', version: '1' })
export class CheckInController {
  constructor(private tickets: TicketsService) {}

  @Post('scan')
  @Roles(Role.STAFF, Role.PRODUCER, Role.ADMIN)
  @Throttle({ default: { ttl: 1000, limit: 5 } }) // max 5 scans/segundo por staff
  @ApiOperation({ summary: 'Escanear QR Code e registrar entrada' })
  async scan(
    @Param('eventId') eventId: string,
    @Body() dto: ScanDto,
    @CurrentUser() user: any,
  ) {
    return this.tickets.validateAndCheckIn(dto.token, eventId, user.id);
  }
}
