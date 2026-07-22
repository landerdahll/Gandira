import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { OrderExpirationService } from './order-expiration.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { ClubBenefitsModule } from '../club-benefits/club-benefits.module';

@Module({
  imports: [TicketsModule, ClubBenefitsModule],
  providers: [OrderExpirationService, OrderFulfillmentService],
  exports: [OrderExpirationService, OrderFulfillmentService],
})
export class OrderFulfillmentModule {}
