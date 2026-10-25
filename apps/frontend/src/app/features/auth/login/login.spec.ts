import { HttpStatusCode } from '@angular/common/http';
import { Router } from '@angular/router';
import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { UserRole } from '@restaurant/shared-api-types';
import { AuthUserDomainModel } from '../../../shared/domain/auth/auth-domain.models';
import { AuthDomainService } from '../../../shared/domain/auth/auth-domain.service';
import { ApiError } from '../../../core/http/api-error';
import { SseService } from '../../../core/realtime/sse.service';

import { AuthStore } from '../auth-store/auth.store';

import { Login } from './login';

describe(Login.name, () => {
  it('should fill the form with a demo account', async () => {
    const user = Arrange.setupUser();
    const { renderResult } = await Arrange.setup(Arrange.createSpies());

    await user.click(renderResult.getByRole('button', { name: 'Admin' }));

    expect(renderResult.getByLabelText('Email')).toHaveProperty(
      'value',
      'admin@example.com',
    );
    expect(renderResult.getByLabelText('Password')).toHaveProperty(
      'value',
      'admin123',
    );
  });

  describe('when the form is empty', () => {
    it('should not sign in', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(spies.authDomainServiceMock.login).not.toHaveBeenCalled();
    });

    it('should show the validation errors', async () => {
      const user = Arrange.setupUser();
      const { renderResult } = await Arrange.setup(Arrange.createSpies());

      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(renderResult.getByText('Enter your email.')).toBeTruthy();
      expect(renderResult.getByText('Enter your password.')).toBeTruthy();
    });
  });

  describe('when the credentials are valid', () => {
    it('should sign in with the entered credentials', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Admin' }));
      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(spies.authDomainServiceMock.login).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'admin123',
      });
    });

    it('should store the signed-in user', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Admin' }));
      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(spies.authStoreMock.setUser).toHaveBeenCalledWith(
        Arrange.createUser(),
      );
    });

    it('should reconnect the event stream', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Admin' }));
      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(spies.sseServiceMock.reconnect).toHaveBeenCalledOnce();
    });

    it('should go to the menu', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      const { renderResult } = await Arrange.setup(spies);

      await user.click(renderResult.getByRole('button', { name: 'Admin' }));
      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(spies.routerMock.navigateByUrl).toHaveBeenCalledWith('/menu');
    });
  });

  describe('when the credentials are wrong', () => {
    it('should explain the error', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.authDomainServiceMock.login.mockReturnValue(
        Arrange.createUnauthorizedError(),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.type(
        renderResult.getByLabelText('Email'),
        'admin@example.com',
      );
      await user.type(renderResult.getByLabelText('Password'), 'wrong');
      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(renderResult.getByRole('alert').textContent).toContain(
        'Invalid email or password.',
      );
    });

    it('should not store a user', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.authDomainServiceMock.login.mockReturnValue(
        Arrange.createUnauthorizedError(),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.type(
        renderResult.getByLabelText('Email'),
        'admin@example.com',
      );
      await user.type(renderResult.getByLabelText('Password'), 'wrong');
      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(spies.authStoreMock.setUser).not.toHaveBeenCalled();
    });

    it('should stay on the page', async () => {
      const user = Arrange.setupUser();
      const spies = Arrange.createSpies();
      spies.authDomainServiceMock.login.mockReturnValue(
        Arrange.createUnauthorizedError(),
      );
      const { renderResult } = await Arrange.setup(spies);

      await user.type(
        renderResult.getByLabelText('Email'),
        'admin@example.com',
      );
      await user.type(renderResult.getByLabelText('Password'), 'wrong');
      await user.click(renderResult.getByRole('button', { name: 'Sign in' }));

      expect(spies.routerMock.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});

interface Spies {
  authDomainServiceMock: { login: Mock };
  sseServiceMock: { reconnect: Mock };
  authStoreMock: { setUser: Mock };
  routerMock: { navigateByUrl: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const renderResult = await render(Login, {
      providers: [
        { provide: AuthDomainService, useValue: spies.authDomainServiceMock },
        { provide: SseService, useValue: spies.sseServiceMock },
        { provide: AuthStore, useValue: spies.authStoreMock },
        { provide: Router, useValue: spies.routerMock },
      ],
    });

    return { renderResult };
  },

  setupUser() {
    return userEvent.setup();
  },

  createSpies(): Spies {
    return {
      authDomainServiceMock: {
        login: vi.fn().mockReturnValue(of(Arrange.createUser())),
      } satisfies Mocked<Pick<AuthDomainService, 'login'>>,
      sseServiceMock: {
        reconnect: vi.fn(),
      } satisfies Mocked<Pick<SseService, 'reconnect'>>,
      authStoreMock: {
        setUser: vi.fn(),
      },
      routerMock: {
        navigateByUrl: vi.fn().mockResolvedValue(true),
      } satisfies Mocked<Pick<Router, 'navigateByUrl'>>,
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

  createUnauthorizedError() {
    return throwError(
      () => new ApiError(HttpStatusCode.Unauthorized, 'Unauthorized'),
    );
  },
};
