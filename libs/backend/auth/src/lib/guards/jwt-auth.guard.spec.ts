import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';

import { AuthenticatedRequest } from '../auth.models';
import { AuthCookieService } from '../utils/auth-cookie.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe(JwtAuthGuard.name, () => {
  it('should let a signed-in user through and attach the user', async () => {
    const spies = Arrange.createSpies();
    spies.authCookieServiceMock.extractUserFromCookie.mockResolvedValue({
      id: 'user-id',
      role: UserRole.Customer,
    });
    const guard = await Arrange.setup(spies);
    const request = Arrange.createRequest();

    await expect(
      guard.canActivate(new ExecutionContextHost([request])),
    ).resolves.toBe(true);

    expect(
      spies.authCookieServiceMock.extractUserFromCookie,
    ).toHaveBeenCalledWith(request);
    expect(request.user).toEqual({ id: 'user-id', role: UserRole.Customer });
  });

  it('should reject a request without a user', async () => {
    const guard = await Arrange.setup();
    const request = Arrange.createRequest();

    await expect(
      guard.canActivate(new ExecutionContextHost([request])),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });
});

interface Spies {
  authCookieServiceMock: { extractUserFromCookie: Mock };
}

const Arrange = {
  async setup(spies?: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: AuthCookieService,
          useValue:
            spies?.authCookieServiceMock ??
            Arrange.createSpies().authCookieServiceMock,
        },
      ],
    }).compile();

    return moduleRef.get(JwtAuthGuard);
  },

  createSpies(): Spies {
    return {
      authCookieServiceMock: {
        extractUserFromCookie: vi.fn().mockResolvedValue(null),
      },
    };
  },

  createRequest(): AuthenticatedRequest {
    return { cookies: {} } as AuthenticatedRequest;
  },
};
