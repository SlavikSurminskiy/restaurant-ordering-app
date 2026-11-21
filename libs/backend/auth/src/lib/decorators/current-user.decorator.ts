import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedRequest, RequestUser } from '../auth.models';

/** The user `JwtAuthGuard` put on the request; use only behind that guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
