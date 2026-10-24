import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { AuthUser, UserRole } from '@restaurant/shared-api-types';

import { AUTH_COOKIE } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe(AuthController.name, () => {
  describe('login', () => {
    it('should set the httpOnly auth cookie and return the user', async () => {
      const user = Arrange.createAuthUser();
      const spies = Arrange.createSpies();
      spies.authServiceMock.login.mockResolvedValue({ user, token: 'token' });
      const controller = await Arrange.setup(spies);

      const result = await controller.login(
        { email: user.email, password: 'admin123' },
        spies.response,
      );

      expect(result).toEqual(user);
      expect(spies.responseMock.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE,
        'token',
        {
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          path: '/',
          maxAge: 60_000,
        },
      );
    });

    it('should reject wrong credentials with 401 and set no cookie', async () => {
      const spies = Arrange.createSpies();
      spies.authServiceMock.login.mockResolvedValue(null);
      const controller = await Arrange.setup(spies);

      await expect(
        controller.login(
          { email: 'admin@example.com', password: 'wrong' },
          spies.response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(spies.responseMock.cookie).not.toHaveBeenCalled();
    });

    it.each([
      [undefined],
      [{}],
      [{ email: 'admin@example.com' }],
      [{ email: '  ', password: 'admin123' }],
      [{ email: 'admin@example.com', password: '' }],
      [{ email: 42, password: 'admin123' }],
    ])('should reject the body %j with 400', async (body) => {
      const spies = Arrange.createSpies();
      const controller = await Arrange.setup(spies);

      await expect(
        controller.login(body, spies.response),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(spies.authServiceMock.login).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear the auth cookie with the options it was set with', async () => {
      const spies = Arrange.createSpies();
      const controller = await Arrange.setup(spies);

      controller.logout(spies.response);

      expect(spies.responseMock.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
      });
    });
  });

  describe('me', () => {
    it('should return the current user from the database', async () => {
      const user = Arrange.createAuthUser();
      const spies = Arrange.createSpies();
      spies.authServiceMock.getUser.mockResolvedValue(user);
      const controller = await Arrange.setup(spies);

      await expect(
        controller.me({ id: user.id, role: user.role }),
      ).resolves.toEqual(user);
      expect(spies.authServiceMock.getUser).toHaveBeenCalledWith(user.id);
    });

    it('should answer 401 when the user no longer exists', async () => {
      const spies = Arrange.createSpies();
      spies.authServiceMock.getUser.mockResolvedValue(null);
      const controller = await Arrange.setup(spies);

      await expect(
        controller.me({ id: 'deleted', role: UserRole.Customer }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});

interface Spies {
  authServiceMock: { login: Mock; getUser: Mock };
  responseMock: { cookie: Mock; clearCookie: Mock };
  response: Response;
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: spies.authServiceMock },
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_TTL: '60' }),
        },
        // Needed by JwtAuthGuard on `me`; the guard itself isn't run here.
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    return moduleRef.get(AuthController);
  },

  createSpies(): Spies {
    const responseMock = { cookie: vi.fn(), clearCookie: vi.fn() };

    return {
      authServiceMock: { login: vi.fn(), getUser: vi.fn() },
      responseMock,
      // Only `cookie` and `clearCookie` are used by the controller.
      response: responseMock as unknown as Response,
    };
  },

  createAuthUser(): AuthUser {
    return {
      id: '9b1d6f6e-2f4a-4c1e-8a57-5f3a3c1f2b10',
      email: 'admin@example.com',
      name: 'Admin',
      role: UserRole.Admin,
    };
  },
};
