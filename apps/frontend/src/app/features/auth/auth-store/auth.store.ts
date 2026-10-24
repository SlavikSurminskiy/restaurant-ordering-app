import { computed } from '@angular/core';
import {
  withState,
  patchState,
  signalStore,
  withMethods,
  withComputed,
} from '@ngrx/signals';

import { UserRole } from '@restaurant/shared-api-types';

import { AuthUserDomainModel } from '../../../shared/domain/auth/auth-domain.models';

import { AuthState } from './auth-store.models';

const initialState: AuthState = {
  user: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user }) => ({
    isSignedIn: computed(() => user() !== null),
    isAdmin: computed(() => user()?.role === UserRole.Admin),
  })),
  withMethods((store) => ({
    setUser(user: AuthUserDomainModel | null): void {
      patchState(store, { user });
    },
    clearUser(): void {
      patchState(store, { user: null });
    },
  })),
);
