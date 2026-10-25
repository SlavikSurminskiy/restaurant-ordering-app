import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';
import { AuthDataAccessService } from '@restaurant/frontend/data-access/auth';
import { ApiError } from '../../../core/http/api-error';

import { AuthUserDomainModel } from './auth-domain.models';
import { AuthDomainService } from './auth-domain.service';

describe(AuthDomainService.name, () => {
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
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthDataAccessService,
          useValue: spies.authDataAccessServiceMock,
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
