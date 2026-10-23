import { inject } from '@angular/core';
import { withState, patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import { errorMessage } from '../../../core/http/api-error';
import { DomainService } from '../../../shared/domain/domain.service';

import { LoadStatus } from './menu-store.enums';
import { MenuState } from './menu-store.models';

const initialState: MenuState = {
  sections: [],
  status: LoadStatus.Idle,
  error: null,
};

export const MenuStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, domain = inject(DomainService)) => ({
    loadMenu: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.status() !== LoadStatus.Loaded) {
            patchState(store, { status: LoadStatus.Loading, error: null });
          }
        }),
        switchMap(() =>
          domain.getMenu().pipe(
            tap(({ sections }) =>
              patchState(store, { sections, status: LoadStatus.Loaded }),
            ),
            catchError((error: unknown) => {
              if (store.status() !== LoadStatus.Loaded) {
                patchState(store, {
                  status: LoadStatus.Error,
                  error: errorMessage(error),
                });
              }
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
  })),
);
