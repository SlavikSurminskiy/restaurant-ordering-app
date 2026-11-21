import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

import {
  DEFAULT_JWT_TTL_SECONDS,
  MIN_PRODUCTION_JWT_SECRET_LENGTH,
} from './auth.constants';

export function jwtTtlSeconds(config: ConfigService): number {
  const ttl = Number(config.get<string>('JWT_TTL') ?? DEFAULT_JWT_TTL_SECONDS);

  return Number.isInteger(ttl) && ttl > 0 ? ttl : DEFAULT_JWT_TTL_SECONDS;
}

export function jwtSecret(config: ConfigService): string {
  const secret = config.getOrThrow<string>('JWT_SECRET');

  if (
    config.get<string>('NODE_ENV') === 'production' &&
    secret.length < MIN_PRODUCTION_JWT_SECRET_LENGTH
  ) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_PRODUCTION_JWT_SECRET_LENGTH} characters in production.`,
    );
  }

  return secret;
}

export function authCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...authCookieBaseOptions(config),
    maxAge: jwtTtlSeconds(config) * 1000,
  };
}

export function authCookieBaseOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Plain http on localhost; production runs behind https.
    secure: config.get<string>('NODE_ENV') === 'production',
    path: '/',
  };
}
