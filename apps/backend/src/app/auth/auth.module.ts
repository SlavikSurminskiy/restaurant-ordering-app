import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/** Moves to `auth-service`; stays here until the auth-service deploy is in place. */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
