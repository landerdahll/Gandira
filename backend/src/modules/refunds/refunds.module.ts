import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { StripeRefundProvider } from './stripe-refund.provider';
import { AbacateRefundProvider } from './abacate-refund.provider';
@Module({ controllers: [RefundsController], providers: [RefundsService, StripeRefundProvider, AbacateRefundProvider], exports: [RefundsService] })
export class RefundsModule {}
