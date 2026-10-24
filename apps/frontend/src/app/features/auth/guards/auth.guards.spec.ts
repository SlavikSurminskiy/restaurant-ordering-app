import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  UrlTree,
  Router,
  CanMatchFn,
  UrlSegment,
  provideRouter,
} from '@angular/router';

import { UserRole } from '@restaurant/shared-api-types';

import { AuthUserDomainModel } from '../../../shared/domain/auth/auth-domain.models';
import { AuthStore } from '../auth-store/auth.store';

import { guestGuard, roleGuard, signedInGuard } from './auth.guards';

describe('auth guards', () => {
  describe('signedInGuard', () => {
    it('should let a signed-in user through', () => {
      Arrange.setup(Arrange.createSpies(Arrange.createUser(UserRole.Customer)));

      expect(Arrange.match(signedInGuard, 'orders')).toBe(true);
    });

    it('should send a guest to the login page', () => {
      Arrange.setup(Arrange.createSpies(null));

      expect(Arrange.url(Arrange.match(signedInGuard, 'orders', '42'))).toBe(
        '/login',
      );
    });
  });

  describe('roleGuard', () => {
    it('should let a user with the role through', () => {
      Arrange.setup(Arrange.createSpies(Arrange.createUser(UserRole.Admin)));

      expect(Arrange.match(roleGuard(UserRole.Admin))).toBe(true);
    });

    it('should send other users to the menu', () => {
      Arrange.setup(Arrange.createSpies(Arrange.createUser(UserRole.Customer)));

      expect(Arrange.url(Arrange.match(roleGuard(UserRole.Admin)))).toBe(
        '/menu',
      );
    });
  });

  describe('guestGuard', () => {
    it('should let a guest through', () => {
      Arrange.setup(Arrange.createSpies(null));

      expect(Arrange.match(guestGuard)).toBe(true);
    });

    it('should send a signed-in user to the menu', () => {
      Arrange.setup(Arrange.createSpies(Arrange.createUser(UserRole.Admin)));

      expect(Arrange.url(Arrange.match(guestGuard))).toBe('/menu');
    });
  });
});

interface Spies {
  authStoreMock: {
    user: WritableSignal<AuthUserDomainModel | null>;
    isSignedIn: WritableSignal<boolean>;
  };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: spies.authStoreMock },
      ],
    });
  },

  createSpies(user: AuthUserDomainModel | null): Spies {
    return {
      authStoreMock: { user: signal(user), isSignedIn: signal(user !== null) },
    };
  },

  match(guard: CanMatchFn, ...paths: string[]): unknown {
    const segments = paths.map((path) => new UrlSegment(path, {}));
    const snapshot = {} as Parameters<CanMatchFn>[2];

    return TestBed.runInInjectionContext(() => guard({}, segments, snapshot));
  },

  url(result: unknown): string {
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  },

  createUser(role: UserRole): AuthUserDomainModel {
    return { id: 'u-1', email: 'user@example.com', name: 'User', role };
  },
};
