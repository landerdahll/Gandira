import { Module } from '@nestjs/common';
import { AbacatepayService } from './abacatepay.service';
import { AbacatepayController } from './abacatepay.controller';
import { OrderFulfillmentModule } from '../order-fulfillment/order-fulfillment.module';

@Module({
  imports: [OrderFulfillmentModule],
  controllers: [AbacatepayController],
  providers: [AbacatepayService],
})
export class AbacatepayModule {}
