import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthModule } from '@restaurant/backend-auth';
import { EventPublisherModule } from '@restaurant/backend-events';
import { DatabaseModule } from '@restaurant/database';

import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule.forRoot('ORDERS_SERVICE_DATABASE_URL'),
    JwtAuthModule,
    EventPublisherModule,
    HealthModule,
    OrdersModule,
  ],
})
export class AppModule {}
