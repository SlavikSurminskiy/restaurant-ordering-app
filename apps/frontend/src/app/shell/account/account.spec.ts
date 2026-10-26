import { signal, WritableSignal } from '@angular/core';
import { render } from '@testing-library/angular';

import { UserRole } from '@restaurant/shared-api-types';
import { AuthUserDomainModel } from '@restaurant/frontend/domain/auth';

import { AuthStore } from '../../features/auth/auth-store/auth.store';

import { Account } from './account';

describe(Account.name, () => {
  it('should show the name of the signed-in user', async () => {
    const { renderResult } = await Arrange.setup(
      Arrange.createSpies(Arrange.createUser()),
    );

    expect(renderResult.container.textContent).toContain('Admin');
  });

  it('should show nothing for a guest', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(null));

    expect(renderResult.container.textContent?.trim()).toBe('');
  });
});

interface Spies {
  authStoreMock: { user: WritableSignal<AuthUserDomainModel | null> };
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(Account, {
      providers: [{ provide: AuthStore, useValue: spies.authStoreMock }],
    });

    return { renderResult };
  },

  createSpies(user: AuthUserDomainModel | null): Spies {
    return { authStoreMock: { user: signal(user) } };
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
