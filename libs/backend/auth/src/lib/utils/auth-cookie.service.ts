import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { UserRole } from '@restaurant/shared-api-types';

import { AUTH_COOKIE } from '../auth.constants';
import { JwtPayload, RequestUser } from '../auth.models';

@Injectable()
export class AuthCookieService {
  constructor(private readonly jwt: JwtService) {}

  async extractUserFromCookie(request: Request): Promise<RequestUser | null> {
    const token: unknown = request.cookies?.[AUTH_COOKIE];

    if (typeof token !== 'string' || !token) {
      return null;
    }

    let payload: unknown;

    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      return null;
    }

    return this.#isJwtPayload(payload)
      ? { id: payload.sub, role: payload.role }
      : null;
  }

  #isJwtPayload(payload: unknown): payload is JwtPayload {
    const { sub, role } = (payload ?? {}) as Partial<
      Record<keyof JwtPayload, unknown>
    >;

    return (
      typeof sub === 'string' &&
      sub !== '' &&
      Object.values<unknown>(UserRole).includes(role)
    );
  }
}
