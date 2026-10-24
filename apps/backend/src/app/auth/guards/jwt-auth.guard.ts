import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserRole } from '@restaurant/shared-api-types';

import { AUTH_COOKIE } from '../auth.constants';
import { AuthenticatedRequest, JwtPayload } from '../auth.models';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = request.cookies?.[AUTH_COOKIE];

    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException();
    }

    let payload: unknown;

    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException();
    }

    if (!isJwtPayload(payload)) {
      throw new UnauthorizedException();
    }

    request.user = { id: payload.sub, role: payload.role };

    return true;
  }
}

function isJwtPayload(payload: unknown): payload is JwtPayload {
  const { sub, role } = (payload ?? {}) as Partial<
    Record<keyof JwtPayload, unknown>
  >;

  return (
    typeof sub === 'string' &&
    sub !== '' &&
    Object.values<unknown>(UserRole).includes(role)
  );
}
