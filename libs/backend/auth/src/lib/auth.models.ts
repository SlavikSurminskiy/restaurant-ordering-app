import type { Request } from 'express';

import { UserRole } from '@restaurant/shared-api-types';

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

/** What `JwtAuthGuard` takes from the token and puts on the request. */
export interface RequestUser {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}
