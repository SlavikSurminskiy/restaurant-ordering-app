import { Reflector } from '@nestjs/core';

import { UserRole } from '@restaurant/shared-api-types';

/** Roles allowed to call a handler or controller; checked by `RolesGuard`. */
export const Roles = Reflector.createDecorator<UserRole[]>();
