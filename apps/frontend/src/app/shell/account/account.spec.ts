import { signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';

import { SseService } from '../../core/realtime/sse.service';
import { AuthStore } from '../../features/auth/auth-store/auth.store';
import { AuthUserDomainModel } from '../../shared/domain/auth/auth-domain.models';
import { AuthDomainService } from '../../shared/domain/auth/auth-domain.service';

import { Account } from './account';

describe(Account.name, () => {
  it('should offer sign-in to a guest', async () => {
    const { renderResult } = await Arrange.setup(Arrange.createSpies(null));

    expect(
      renderResult.getByRole('link', { name: 'Sign in' }).getAttribute('href'),
    ).toBe('/login');
  });

  describe('when signed in', () => {
    it('should show the user name', async () => {
      const spies = Arrange.createSpies(Arrange.createUser());
      const { renderResult } = await Arrange.setup(spies);

      expect(renderResult.getByText('Admin')).toBeTruthy();
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

    it('should reconnect the event stream after sign-out', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies(Arrange.createUser());
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Sign out' }));

      expect(spies.sseServiceMock.reconnect).toHaveBeenCalledOnce();
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
  sseServiceMock: { reconnect: Mock };
  authStoreMock: {
    user: WritableSignal<AuthUserDomainModel | null>;
    clearUser: Mock;
  };
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(Account, {
      providers: [
        provideRouter([]),
        { provide: AuthDomainService, useValue: spies.authDomainServiceMock },
        { provide: SseService, useValue: spies.sseServiceMock },
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

  createSpies(user: AuthUserDomainModel | null): Spies {
    return {
      authDomainServiceMock: {
        logout: vi.fn().mockReturnValue(of(undefined)),
      } satisfies Mocked<Pick<AuthDomainService, 'logout'>>,
      sseServiceMock: {
        reconnect: vi.fn(),
      } satisfies Mocked<Pick<SseService, 'reconnect'>>,
      authStoreMock: {
        user: signal(user),
        clearUser: vi.fn(),
      },
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
