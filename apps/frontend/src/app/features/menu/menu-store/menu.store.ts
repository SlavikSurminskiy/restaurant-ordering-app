import { computed, inject } from '@angular/core';
import {
  withState,
  withProps,
  patchState,
  signalStore,
  withMethods,
  withComputed,
} from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { errorMessage } from '@restaurant/frontend/core/http';

import { categoryConfig, dishConfig } from './menu-store.constants';
import { LoadStatus, MenuUpdateKind } from './menu-store.enums';
import { MenuState, MenuUpdate } from './menu-store.models';
import { MenuStoreService } from './menu-store.service';

const initialState: MenuState = {
  status: LoadStatus.Loading,
  error: null,
};

export const MenuStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities(categoryConfig),
  withEntities(dishConfig),
  withProps(() => ({
    _menuStoreService: inject(MenuStoreService),
  })),
  withComputed(({ categoryEntities, dishEntities, _menuStoreService }) => ({
    sections: computed(() =>
      _menuStoreService.buildSections(categoryEntities(), dishEntities()),
    ),
  })),
  withMethods((store) => ({
    _applyUpdate(update: MenuUpdate): void {
      switch (update.kind) {
        case MenuUpdateKind.Snapshot:
          patchState(
            store,
            setAllEntities(update.menu.categories, categoryConfig),
            setAllEntities(update.menu.dishes, dishConfig),
            { status: LoadStatus.Loaded, error: null },
          );
          break;
        case MenuUpdateKind.SnapshotFailed:
          // A shown menu stays on screen while the reload is retried.
          if (store.status() !== LoadStatus.Loaded) {
            patchState(store, {
              status: LoadStatus.Error,
              error: errorMessage(update.error),
            });
          }
          break;
        case MenuUpdateKind.Event:
          patchState(store, store._menuStoreService.eventUpdater(update.event));
          break;
      }
    },
  })),
  withMethods((store) => ({
    keepMenuUpToDate: rxMethod<void>(
      pipe(
        switchMap(() => store._menuStoreService.menuUpdates()),
        tap((update) => store._applyUpdate(update)),
      ),
    ),
  })),
);
