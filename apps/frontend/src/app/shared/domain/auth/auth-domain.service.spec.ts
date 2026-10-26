import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';
import { AuthDataAccessService } from '@restaurant/frontend/data-access/auth';
import { SseDataAccessService } from '@restaurant/frontend/data-access/sse';
import { ApiError } from '@restaurant/frontend/core/http';

import { AuthUserDomainModel } from './auth-domain.models';
import { AuthDomainService } from './auth-domain.service';

describe(AuthDomainService.name, () => {
  describe('event stream', () => {
    it('should reconnect the event stream after a login', async () => {
      const spies = Arrange.createSpies();
      spies.authDataAccessServiceMock.login.mockReturnValue(
        of(Arrange.createUser()),
      );
      const service = Arrange.setup(spies);

      await firstValueFrom(
        service.login({ email: 'admin@example.com', password: 'admin123' }),
      );

      expect(spies.sseDataAccessServiceMock.reconnect).toHaveBeenCalledOnce();
    });

    it('should not reconnect after a failed login', async () => {
      const spies = Arrange.createSpies();
      spies.authDataAccessServiceMock.login.mockReturnValue(
        throwError(() => new ApiError(HttpStatusCode.Unauthorized, 'x')),
      );
      const service = Arrange.setup(spies);

      await expect(
        firstValueFrom(
          service.login({ email: 'admin@example.com', password: 'wrong' }),
        ),
      ).rejects.toBeInstanceOf(ApiError);
      expect(spies.sseDataAccessServiceMock.reconnect).not.toHaveBeenCalled();
    });

    it('should reconnect the event stream after a logout', async () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);

      await firstValueFrom(service.logout(), { defaultValue: undefined });

      expect(spies.sseDataAccessServiceMock.reconnect).toHaveBeenCalledOnce();
    });
  });

  describe('getCurrentUser', () => {
    it('should return the signed-in user', async () => {
      const user = Arrange.createUser();
      const spies = Arrange.createSpies();
      spies.authDataAccessServiceMock.getMe.mockReturnValue(of(user));
      const service = Arrange.setup(spies);

      await expect(firstValueFrom(service.getCurrentUser())).resolves.toEqual(
        user,
      );
    });

    it('should return null for a guest', async () => {
      const spies = Arrange.createSpies();
      spies.authDataAccessServiceMock.getMe.mockReturnValue(
        throwError(() => new ApiError(HttpStatusCode.Unauthorized, 'x')),
      );
      const service = Arrange.setup(spies);

      await expect(
        firstValueFrom(service.getCurrentUser()),
      ).resolves.toBeNull();
    });

    it('should pass other errors on', async () => {
      const error = new ApiError(HttpStatusCode.InternalServerError, 'x');
      const spies = Arrange.createSpies();
      spies.authDataAccessServiceMock.getMe.mockReturnValue(
        throwError(() => error),
      );
      const service = Arrange.setup(spies);

      await expect(firstValueFrom(service.getCurrentUser())).rejects.toBe(
        error,
      );
    });
  });
});

interface Spies {
  authDataAccessServiceMock: { login: Mock; logout: Mock; getMe: Mock };
  sseDataAccessServiceMock: { reconnect: Mock };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthDataAccessService,
          useValue: spies.authDataAccessServiceMock,
        },
        {
          provide: SseDataAccessService,
          useValue: spies.sseDataAccessServiceMock,
        },
      ],
    });

    return TestBed.inject(AuthDomainService);
  },

  createSpies(): Spies {
    return {
      authDataAccessServiceMock: {
        login: vi.fn(),
        logout: vi.fn().mockReturnValue(of(undefined)),
        getMe: vi.fn(),
      } satisfies Mocked<
        Pick<AuthDataAccessService, 'login' | 'logout' | 'getMe'>
      >,
      sseDataAccessServiceMock: {
        reconnect: vi.fn(),
      } satisfies Mocked<Pick<SseDataAccessService, 'reconnect'>>,
    };
  },

  createUser(): AuthUserDomainModel {
    return {
      id: 'u-admin',
      email: 'admin@example.com',
      name: 'Admin',
      role: UserRole.Admin,
    };
  },
};
