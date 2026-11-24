import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { JwtAuthModule } from '@restaurant/backend-auth';
import { EventPublisherModule } from '@restaurant/backend-events';
import { DatabaseModule } from '@restaurant/database';

import { DiscountModule } from './discount/discount.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { OrderPricingModule } from './order-pricing/order-pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule.forRoot('MENU_SERVICE_DATABASE_URL'),
    JwtAuthModule,
    EventPublisherModule,
    DiscountModule,
    HealthModule,
    MenuModule,
    OrderPricingModule,
  ],
})
export class AppModule {}
