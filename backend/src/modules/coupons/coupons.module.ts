import { Module } from '@nestjs/common';
import { CouponsController, CouponsPublicController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  controllers: [CouponsController, CouponsPublicController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
