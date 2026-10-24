import { TestBed } from '@angular/core/testing';

import { UserRole } from '@restaurant/shared-api-types';

import { AuthUserDomainModel } from '../../../shared/domain/auth/auth-domain.models';

import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  it('should start with a guest', () => {
    const store = Arrange.setup();

    expect(store.user()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
    expect(store.isAdmin()).toBe(false);
  });

  it('should hold the signed-in user', () => {
    const admin = Arrange.createUser(UserRole.Admin);
    const store = Arrange.setup();

    store.setUser(admin);

    expect(store.user()).toEqual(admin);
    expect(store.isSignedIn()).toBe(true);
    expect(store.isAdmin()).toBe(true);
  });

  it('should not treat a customer as an admin', () => {
    const store = Arrange.setup();

    store.setUser(Arrange.createUser(UserRole.Customer));

    expect(store.isSignedIn()).toBe(true);
    expect(store.isAdmin()).toBe(false);
  });

  it('should go back to a guest on clear', () => {
    const store = Arrange.setup();
    store.setUser(Arrange.createUser(UserRole.Admin));

    store.clearUser();

    expect(store.user()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
  });
});

const Arrange = {
  setup() {
    return TestBed.inject(AuthStore);
  },

  createUser(role: UserRole): AuthUserDomainModel {
    return { id: 'u-1', email: 'user@example.com', name: 'User', role };
  },
};
