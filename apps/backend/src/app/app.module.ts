import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@restaurant/database';

import { DiscountModule } from './discount/discount.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule,
    EventsModule,
    DiscountModule,
    HealthModule,
    MenuModule,
  ],
})
export class AppModule {}
