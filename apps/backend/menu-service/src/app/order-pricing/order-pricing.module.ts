import { Module } from '@nestjs/common';

import { DiscountModule } from '../discount/discount.module';

import { OrderPricingController } from './order-pricing.controller';
import { OrderPricingService } from './order-pricing.service';

@Module({
  imports: [DiscountModule],
  controllers: [OrderPricingController],
  providers: [OrderPricingService],
})
export class OrderPricingModule {}
