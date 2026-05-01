import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BatchesModule } from '../batches/batches.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [BatchesModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
