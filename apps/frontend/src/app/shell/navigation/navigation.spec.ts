import { computed, Signal, signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { render, RenderResult } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';
import {
  AuthUserDomainModel,
  AuthDomainService,
} from '@restaurant/frontend/domain/auth';

import { AuthStore } from '../../features/auth/auth-store/auth.store';

import { Navigation } from './navigation';

describe(Navigation.name, () => {
  it('should link everyone to the menu', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(null));

    expect(
      renderResult.getByRole('link', { name: 'Menu' }).getAttribute('href'),
    ).toBe('/menu');
  });

  it('should offer only the menu and sign-in to a guest', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(null));

    expect(Arrange.navItems(renderResult)).toEqual(['Menu', 'Sign in']);
  });

  it('should offer sign-in to a guest', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(null));

    expect(
      renderResult.getByRole('link', { name: 'Sign in' }).getAttribute('href'),
    ).toBe('/login');
  });

  describe('when signed in', () => {
    it('should show the links of an admin in order', async () => {
      const spies = Arrange.createSpies(Arrange.createUser());
      const { renderResult } = await Arrange.setup(spies);

      expect(Arrange.navItems(renderResult)).toEqual([
        'Menu',
        'Setup menu',
        'Orders',
        'Sign out',
      ]);
    });

    it('should show the links of a customer in order', async () => {
      const spies = Arrange.createSpies(Arrange.createUser(UserRole.Customer));
      const { renderResult } = await Arrange.setup(spies);

      expect(Arrange.navItems(renderResult)).toEqual([
        'Menu',
        'Orders',
        'Sign out',
      ]);
    });

    it('should link a signed-in user to the orders', async () => {
      const spies = Arrange.createSpies(Arrange.createUser(UserRole.Customer));
      const { renderResult } = await Arrange.setup(spies);

      expect(
        renderResult.getByRole('link', { name: 'Orders' }).getAttribute('href'),
      ).toBe('/orders');
    });

    it('should link an admin to the menu setup', async () => {
      const spies = Arrange.createSpies(Arrange.createUser());
      const { renderResult } = await Arrange.setup(spies);

      expect(
        renderResult
          .getByRole('link', { name: 'Setup menu' })
          .getAttribute('href'),
      ).toBe('/setup-menu');
    });

    it('should not offer the menu setup to a customer', async () => {
      const spies = Arrange.createSpies(Arrange.createUser(UserRole.Customer));
      const { renderResult } = await Arrange.setup(spies);

      expect(
        renderResult.queryByRole('link', { name: 'Setup menu' }),
      ).toBeNull();
    });

    it('should log out on the server', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies(Arrange.createUser());
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Sign out' }));

      expect(spies.authDomainServiceMock.logout).toHaveBeenCalledOnce();
    });

    it('should clear the user after sign-out', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies(Arrange.createUser());
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Sign out' }));

      expect(spies.authStoreMock.clearUser).toHaveBeenCalledOnce();
    });

    it('should go to the menu after sign-out', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies(Arrange.createUser());
      const { renderResult, navigateByUrlSpy } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Sign out' }));

      expect(navigateByUrlSpy).toHaveBeenCalledWith('/menu');
    });
  });
});

interface Spies {
  authDomainServiceMock: { logout: Mock };
  authStoreMock: {
    user: WritableSignal<AuthUserDomainModel | null>;
    isSignedIn: Signal<boolean>;
    isAdmin: Signal<boolean>;
    clearUser: Mock;
  };
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(Navigation, {
      providers: [
        provideRouter([]),
        { provide: AuthDomainService, useValue: spies.authDomainServiceMock },
        { provide: AuthStore, useValue: spies.authStoreMock },
      ],
    });

    const navigateByUrlSpy = vi
      .spyOn(renderResult.debugElement.injector.get(Router), 'navigateByUrl')
      .mockResolvedValue(true);

    return { renderResult, navigateByUrlSpy };
  },

  setupUser() {
    return userEvent.setup();
  },

  /** The links and buttons of the navigation, in the order they are shown. */
  navItems(renderResult: RenderResult<Navigation>): string[] {
    return Array.from(
      renderResult.getByRole('navigation').querySelectorAll('a, button'),
      (item) => item.textContent?.trim() ?? '',
    );
  },

  createSpies(user: AuthUserDomainModel | null): Spies {
    const userSignal = signal(user);

    return {
      authDomainServiceMock: {
        logout: vi.fn().mockReturnValue(of(undefined)),
      } satisfies Mocked<Pick<AuthDomainService, 'logout'>>,
      authStoreMock: {
        user: userSignal,
        isSignedIn: computed(() => userSignal() !== null),
        isAdmin: computed(() => userSignal()?.role === UserRole.Admin),
        clearUser: vi.fn(),
      },
    };
  },

  createUser(role: UserRole = UserRole.Admin): AuthUserDomainModel {
    return {
      id: 'u-admin',
      email: 'admin@example.com',
      name: 'Admin',
      role,
    };
  },
};
