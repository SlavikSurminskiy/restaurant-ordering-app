import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { jwtSecret, jwtTtlSeconds } from './auth.config';
import { JWT_ALGORITHM } from './auth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthCookieService } from './utils/auth-cookie.service';

/**
 * JWT settings shared by every backend service: all of them verify the cookie
 * with the same `JWT_SECRET`; only the auth service signs tokens.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtSecret(config),
        signOptions: {
          algorithm: JWT_ALGORITHM,
          expiresIn: jwtTtlSeconds(config),
        },
        verifyOptions: { algorithms: [JWT_ALGORITHM] },
      }),
    }),
  ],
  providers: [JwtAuthGuard, RolesGuard, AuthCookieService],
  exports: [JwtModule, JwtAuthGuard, RolesGuard, AuthCookieService],
})
export class JwtAuthModule {}
