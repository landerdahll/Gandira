import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrderFulfillmentModule } from '../order-fulfillment/order-fulfillment.module';
import { ClubBenefitsModule } from '../club-benefits/club-benefits.module';

@Module({
  imports: [OrderFulfillmentModule, ClubBenefitsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
