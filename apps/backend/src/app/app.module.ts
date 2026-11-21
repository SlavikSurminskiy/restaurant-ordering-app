import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthModule } from '@restaurant/backend-auth';
import { DatabaseModule } from '@restaurant/database';

import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule,
    JwtAuthModule,
    EventsModule,
    HealthModule,
    OrdersModule,
  ],
})
export class AppModule {}
