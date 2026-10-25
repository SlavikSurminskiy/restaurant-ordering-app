import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';
import { AuthDomainService } from '@restaurant/frontend/domain/auth';
import { ApiError } from '../../core/http/api-error';

import { AuthStore } from './auth-store/auth.store';
import { restoreSession } from './restore-session';

describe(restoreSession.name, () => {
  it('should put the signed-in user into the store', async () => {
    const admin = { id: 'u-1', email: 'a@x', name: 'A', role: UserRole.Admin };
    const spies = Arrange.createSpies();
    spies.authDomainServiceMock.getCurrentUser.mockReturnValue(of(admin));
    Arrange.setup(spies);

    await TestBed.runInInjectionContext(restoreSession);

    expect(TestBed.inject(AuthStore).user()).toEqual(admin);
  });

  it('should start as a guest when the server is unreachable', async () => {
    const spies = Arrange.createSpies();
    spies.authDomainServiceMock.getCurrentUser.mockReturnValue(
      throwError(() => new ApiError(0, 'offline')),
    );
    Arrange.setup(spies);

    await TestBed.runInInjectionContext(restoreSession);

    expect(TestBed.inject(AuthStore).user()).toBeNull();
  });
});

interface Spies {
  authDomainServiceMock: { getCurrentUser: Mock };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthDomainService, useValue: spies.authDomainServiceMock },
      ],
    });
  },

  createSpies(): Spies {
    return {
      authDomainServiceMock: {
        getCurrentUser: vi.fn().mockReturnValue(of(null)),
      } satisfies Mocked<Pick<AuthDomainService, 'getCurrentUser'>>,
    };
  },
};
