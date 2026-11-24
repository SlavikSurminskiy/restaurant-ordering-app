import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { JwtAuthModule } from '@restaurant/backend-auth';
import { DatabaseModule } from '@restaurant/database';

import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule.forRoot('AUTH_SERVICE_DATABASE_URL'),
    JwtAuthModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
