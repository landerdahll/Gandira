import { Module } from '@nestjs/common';
import { CouponsController, CouponsPublicController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [CouponsController, CouponsPublicController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
