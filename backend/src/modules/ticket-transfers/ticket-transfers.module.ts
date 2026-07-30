import { Module } from '@nestjs/common';
import { TicketTransfersController } from './ticket-transfers.controller';
import { TicketTransfersService } from './ticket-transfers.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({ imports: [OrganizationsModule], controllers: [TicketTransfersController], providers: [TicketTransfersService], exports: [TicketTransfersService] })
export class TicketTransfersModule {}
