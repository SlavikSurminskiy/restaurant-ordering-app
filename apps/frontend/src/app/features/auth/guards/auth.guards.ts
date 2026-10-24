import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { UserRole } from '@restaurant/shared-api-types';

import { AuthStore } from '../auth-store/auth.store';

export const signedInGuard: CanMatchFn = () =>
  inject(AuthStore).isSignedIn() || inject(Router).createUrlTree(['/login']);

export function roleGuard(role: UserRole): CanMatchFn {
  return () =>
    inject(AuthStore).user()?.role === role ||
    inject(Router).createUrlTree(['/menu']);
}

export const guestGuard: CanMatchFn = () =>
  !inject(AuthStore).isSignedIn() || inject(Router).createUrlTree(['/menu']);
