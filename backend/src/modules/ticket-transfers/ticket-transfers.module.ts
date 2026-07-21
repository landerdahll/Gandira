import { Module } from '@nestjs/common';
import { TicketTransfersController } from './ticket-transfers.controller';
import { TicketTransfersService } from './ticket-transfers.service';

@Module({ controllers: [TicketTransfersController], providers: [TicketTransfersService], exports: [TicketTransfersService] })
export class TicketTransfersModule {}
