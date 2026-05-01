import { Module } from '@nestjs/common';
import { CheckInController } from './checkin.controller';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [CheckInController],
})
export class CheckInModule {}
