import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@restaurant/database';

import { AuthModule } from './auth/auth.module';
import { DiscountModule } from './discount/discount.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule,
    EventsModule,
    AuthModule,
    DiscountModule,
    HealthModule,
    MenuModule,
    OrdersModule,
  ],
})
export class AppModule {}
