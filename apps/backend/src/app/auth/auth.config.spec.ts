import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';

import {
  jwtSecret,
  jwtTtlSeconds,
  authCookieOptions,
  authCookieBaseOptions,
} from './auth.config';
import { DEFAULT_JWT_TTL_SECONDS } from './auth.constants';

describe('auth.config', () => {
  describe(jwtTtlSeconds.name, () => {
    it('should read JWT_TTL in seconds', () => {
      expect(jwtTtlSeconds(Arrange.createConfig({ JWT_TTL: '60' }))).toBe(60);
    });

    it.each([[undefined], ['abc'], ['0'], ['-5'], ['0.5']])(
      'should fall back to the default for JWT_TTL=%s',
      (JWT_TTL) => {
        expect(jwtTtlSeconds(Arrange.createConfig({ JWT_TTL }))).toBe(
          DEFAULT_JWT_TTL_SECONDS,
        );
      },
    );
  });

  describe(jwtSecret.name, () => {
    it('should accept a short secret outside production', () => {
      expect(jwtSecret(Arrange.createConfig({ JWT_SECRET: 'dev' }))).toBe(
        'dev',
      );
    });

    it('should reject a short secret in production', () => {
      const config = Arrange.createConfig({
        JWT_SECRET: 'local-dev-jwt-secret-change-me',
        NODE_ENV: 'production',
      });

      expect(() => jwtSecret(config)).toThrow(/at least 32 characters/);
    });

    it('should accept a long secret in production', () => {
      const secret = 'x'.repeat(32);
      const config = Arrange.createConfig({
        JWT_SECRET: secret,
        NODE_ENV: 'production',
      });

      expect(jwtSecret(config)).toBe(secret);
    });

    it('should require JWT_SECRET', () => {
      // ConfigService also reads process.env, which Nx fills from a local .env.
      vi.stubEnv('JWT_SECRET', undefined);

      expect(() => jwtSecret(Arrange.createConfig({}))).toThrow();

      vi.unstubAllEnvs();
    });
  });

  describe(authCookieOptions.name, () => {
    it('should make the cookie httpOnly, SameSite=Lax and as long-lived as the token', () => {
      expect(
        authCookieOptions(Arrange.createConfig({ JWT_TTL: '60' })),
      ).toEqual({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: 60_000,
      });
    });

    it('should make the cookie secure in production', () => {
      const config = Arrange.createConfig({ NODE_ENV: 'production' });

      expect(authCookieOptions(config).secure).toBe(true);
      expect(authCookieBaseOptions(config).secure).toBe(true);
    });
  });
});

const Arrange = {
  createConfig(values: Record<string, string | undefined>): ConfigService {
    return new ConfigService(values);
  },
};
