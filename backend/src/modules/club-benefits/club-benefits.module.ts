import { Module } from '@nestjs/common';
import { ClubBenefitsService } from './club-benefits.service';

@Module({
  providers: [ClubBenefitsService],
  exports: [ClubBenefitsService],
})
export class ClubBenefitsModule {}
