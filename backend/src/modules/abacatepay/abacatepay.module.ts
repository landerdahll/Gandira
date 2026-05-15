import { Module } from '@nestjs/common';
import { AbacatepayService } from './abacatepay.service';
import { AbacatepayController } from './abacatepay.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TicketsModule, MailModule],
  controllers: [AbacatepayController],
  providers: [AbacatepayService],
})
export class AbacatepayModule {}
