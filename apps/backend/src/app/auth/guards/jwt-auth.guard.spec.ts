import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';

import { AUTH_COOKIE, JWT_ALGORITHM } from '../auth.constants';
import { AuthenticatedRequest } from '../auth.models';
import { JwtAuthGuard } from './jwt-auth.guard';

describe(JwtAuthGuard.name, () => {
  it('should let a request with a valid token through and attach the user', async () => {
    const spies = Arrange.createSpies();
    spies.jwtMock.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      role: UserRole.Customer,
    });
    const guard = await Arrange.setup(spies);
    const request = Arrange.createRequest({ [AUTH_COOKIE]: 'token' });

    await expect(
      guard.canActivate(new ExecutionContextHost([request])),
    ).resolves.toBe(true);

    expect(spies.jwtMock.verifyAsync).toHaveBeenCalledWith('token');
    expect(request.user).toEqual({ id: 'user-id', role: UserRole.Customer });
  });

  it('should reject a request without the auth cookie', async () => {
    const guard = await Arrange.setup(Arrange.createSpies());
    const request = Arrange.createRequest({});

    await expect(
      guard.canActivate(new ExecutionContextHost([request])),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should reject an invalid or expired token', async () => {
    const spies = Arrange.createSpies();
    spies.jwtMock.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const guard = await Arrange.setup(spies);
    const request = Arrange.createRequest({ [AUTH_COOKIE]: 'expired' });

    await expect(
      guard.canActivate(new ExecutionContextHost([request])),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });

  it.each([
    [{ role: UserRole.Admin }],
    [{ sub: '', role: UserRole.Admin }],
    [{ sub: 'user-id', role: 'SUPERUSER' }],
    [{ sub: 'user-id' }],
  ])('should reject a signed token with the payload %j', async (payload) => {
    const spies = Arrange.createSpies();
    spies.jwtMock.verifyAsync.mockResolvedValue(payload);
    const guard = await Arrange.setup(spies);
    const request = Arrange.createRequest({ [AUTH_COOKIE]: 'token' });

    await expect(
      guard.canActivate(new ExecutionContextHost([request])),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });

  describe('with a real JwtService', () => {
    it('should accept a token it signed', async () => {
      const jwt = Arrange.createJwtService('secret');
      const guard = new JwtAuthGuard(jwt);
      const token = await jwt.signAsync({
        sub: 'user-id',
        role: UserRole.Admin,
      });
      const request = Arrange.createRequest({ [AUTH_COOKIE]: token });

      await expect(
        guard.canActivate(new ExecutionContextHost([request])),
      ).resolves.toBe(true);
    });

    it('should reject a token signed with another secret', async () => {
      const guard = new JwtAuthGuard(Arrange.createJwtService('secret'));
      const token = await Arrange.createJwtService('other').signAsync({
        sub: 'user-id',
        role: UserRole.Admin,
      });
      const request = Arrange.createRequest({ [AUTH_COOKIE]: token });

      await expect(
        guard.canActivate(new ExecutionContextHost([request])),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject an unsigned token (alg: none)', async () => {
      const guard = new JwtAuthGuard(Arrange.createJwtService('secret'));
      const token = Arrange.createUnsignedToken({
        sub: 'user-id',
        role: UserRole.Admin,
      });
      const request = Arrange.createRequest({ [AUTH_COOKIE]: token });

      await expect(
        guard.canActivate(new ExecutionContextHost([request])),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject an expired token', async () => {
      const jwt = Arrange.createJwtService('secret');
      const guard = new JwtAuthGuard(jwt);
      const token = await jwt.signAsync(
        { sub: 'user-id', role: UserRole.Admin },
        { expiresIn: -1 },
      );
      const request = Arrange.createRequest({ [AUTH_COOKIE]: token });

      await expect(
        guard.canActivate(new ExecutionContextHost([request])),
      ).rejects.toBeInstanceOf(UnauthorizedException);
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
        JwtAuthGuard,
        { provide: JwtService, useValue: spies.jwtMock },
      ],
    }).compile();

    return moduleRef.get(JwtAuthGuard);
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

  createRequest(cookies: Record<string, string>): AuthenticatedRequest {
    return { cookies } as AuthenticatedRequest;
  },
};
