import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { UserRole } from '@restaurant/shared-api-types';

import { AuthenticatedRequest, RequestUser } from '../auth.models';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe(RolesGuard.name, () => {
  it('should allow any request to a handler without @Roles', () => {
    const guard = Arrange.setup();

    expect(guard.canActivate(Arrange.createContext('open', undefined))).toBe(
      true,
    );
  });

  it('should allow a user with one of the required roles', () => {
    const guard = Arrange.setup();

    expect(
      guard.canActivate(
        Arrange.createContext('adminOnly', Arrange.createUser(UserRole.Admin)),
      ),
    ).toBe(true);
  });

  it('should forbid a user without the required role', () => {
    const guard = Arrange.setup();

    expect(() =>
      guard.canActivate(
        Arrange.createContext(
          'adminOnly',
          Arrange.createUser(UserRole.Customer),
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should forbid a request without a user', () => {
    const guard = Arrange.setup();

    expect(() =>
      guard.canActivate(Arrange.createContext('adminOnly', undefined)),
    ).toThrow(ForbiddenException);
  });
});

class TestController {
  @Roles([UserRole.Admin])
  adminOnly(): string {
    return 'admin only';
  }

  open(): string {
    return 'open';
  }
}

const Arrange = {
  setup() {
    return new RolesGuard(new Reflector());
  },

  createContext(
    handler: keyof TestController,
    user: RequestUser | undefined,
  ): ExecutionContextHost {
    const request = { user } as AuthenticatedRequest;

    return new ExecutionContextHost(
      [request],
      TestController,
      TestController.prototype[handler],
    );
  },

  createUser(role: UserRole): RequestUser {
    return { id: 'user-id', role };
  },
};
