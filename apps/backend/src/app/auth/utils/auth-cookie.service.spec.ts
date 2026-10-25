import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';

import { AUTH_COOKIE, JWT_ALGORITHM } from '../auth.constants';
import { AuthCookieService } from './auth-cookie.service';

describe(AuthCookieService.name, () => {
  it('should return the user of a valid token', async () => {
    const spies = Arrange.createSpies();
    spies.jwtMock.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      role: UserRole.Customer,
    });
    const service = await Arrange.setup(spies);

    await expect(
      service.extractUserFromCookie(
        Arrange.createRequest({ [AUTH_COOKIE]: 'token' }),
      ),
    ).resolves.toEqual({ id: 'user-id', role: UserRole.Customer });
    expect(spies.jwtMock.verifyAsync).toHaveBeenCalledWith('token');
  });

  it('should return null without the auth cookie', async () => {
    const spies = Arrange.createSpies();
    const service = await Arrange.setup(spies);

    await expect(
      service.extractUserFromCookie(Arrange.createRequest({})),
    ).resolves.toBeNull();
    expect(spies.jwtMock.verifyAsync).not.toHaveBeenCalled();
  });

  it('should return null for an invalid or expired token', async () => {
    const spies = Arrange.createSpies();
    spies.jwtMock.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const service = await Arrange.setup(spies);

    await expect(
      service.extractUserFromCookie(
        Arrange.createRequest({ [AUTH_COOKIE]: 'expired' }),
      ),
    ).resolves.toBeNull();
  });

  it.each([
    [{ role: UserRole.Admin }],
    [{ sub: '', role: UserRole.Admin }],
    [{ sub: 'user-id', role: 'SUPERUSER' }],
    [{ sub: 'user-id' }],
  ])(
    'should return null for a signed token with the payload %j',
    async (payload) => {
      const spies = Arrange.createSpies();
      spies.jwtMock.verifyAsync.mockResolvedValue(payload);
      const service = await Arrange.setup(spies);

      await expect(
        service.extractUserFromCookie(
          Arrange.createRequest({ [AUTH_COOKIE]: 'token' }),
        ),
      ).resolves.toBeNull();
    },
  );

  describe('with a real JwtService', () => {
    it('should accept a token it signed', async () => {
      const jwt = Arrange.createJwtService('secret');
      const service = new AuthCookieService(jwt);
      const token = await jwt.signAsync({
        sub: 'user-id',
        role: UserRole.Admin,
      });

      await expect(
        service.extractUserFromCookie(
          Arrange.createRequest({ [AUTH_COOKIE]: token }),
        ),
      ).resolves.toEqual({ id: 'user-id', role: UserRole.Admin });
    });

    it('should reject a token signed with another secret', async () => {
      const service = new AuthCookieService(Arrange.createJwtService('secret'));
      const token = await Arrange.createJwtService('other').signAsync({
        sub: 'user-id',
        role: UserRole.Admin,
      });

      await expect(
        service.extractUserFromCookie(
          Arrange.createRequest({ [AUTH_COOKIE]: token }),
        ),
      ).resolves.toBeNull();
    });

    it('should reject an unsigned token (alg: none)', async () => {
      const service = new AuthCookieService(Arrange.createJwtService('secret'));
      const token = Arrange.createUnsignedToken({
        sub: 'user-id',
        role: UserRole.Admin,
      });

      await expect(
        service.extractUserFromCookie(
          Arrange.createRequest({ [AUTH_COOKIE]: token }),
        ),
      ).resolves.toBeNull();
    });

    it('should reject an expired token', async () => {
      const jwt = Arrange.createJwtService('secret');
      const service = new AuthCookieService(jwt);
      const token = await jwt.signAsync(
        { sub: 'user-id', role: UserRole.Admin },
        { expiresIn: -1 },
      );

      await expect(
        service.extractUserFromCookie(
          Arrange.createRequest({ [AUTH_COOKIE]: token }),
        ),
      ).resolves.toBeNull();
    });
  });
});

interface Spies {
  jwtMock: { verifyAsync: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthCookieService,
        { provide: JwtService, useValue: spies.jwtMock },
      ],
    }).compile();

    return moduleRef.get(AuthCookieService);
  },

  createSpies(): Spies {
    return { jwtMock: { verifyAsync: vi.fn() } };
  },

  createJwtService(secret: string): JwtService {
    return new JwtService({
      secret,
      signOptions: { algorithm: JWT_ALGORITHM },
      verifyOptions: { algorithms: [JWT_ALGORITHM] },
    });
  },

  createUnsignedToken(payload: object): string {
    const encode = (part: object) =>
      Buffer.from(JSON.stringify(part)).toString('base64url');

    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
  },

  createRequest(cookies: Record<string, string>): Request {
    return { cookies } as Request;
  },
};
