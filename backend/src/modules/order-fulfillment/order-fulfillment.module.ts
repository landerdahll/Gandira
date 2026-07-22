import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { OrderExpirationService } from './order-expiration.service';
import { OrderFulfillmentService } from './order-fulfillment.service';

@Module({
  imports: [TicketsModule],
  providers: [OrderExpirationService, OrderFulfillmentService],
  exports: [OrderExpirationService, OrderFulfillmentService],
})
export class OrderFulfillmentModule {}
