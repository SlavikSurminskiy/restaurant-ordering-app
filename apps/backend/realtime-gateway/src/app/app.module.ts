import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { JwtAuthModule } from '@restaurant/backend-auth';

import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    JwtAuthModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}
