import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrderFulfillmentModule } from '../order-fulfillment/order-fulfillment.module';

@Module({
  imports: [OrderFulfillmentModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
