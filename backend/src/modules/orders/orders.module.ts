import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BatchesModule } from '../batches/batches.module';
import { PaymentsModule } from '../payments/payments.module';
import { CouponsModule } from '../coupons/coupons.module';
import { OrderFulfillmentModule } from '../order-fulfillment/order-fulfillment.module';

@Module({
  imports: [BatchesModule, PaymentsModule, CouponsModule, OrderFulfillmentModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
