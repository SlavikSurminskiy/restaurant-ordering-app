import { computed, inject } from '@angular/core';
import {
  withHooks,
  withState,
  withProps,
  patchState,
  signalStore,
  withMethods,
  withComputed,
} from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tap } from 'rxjs';

import {
  MenuStreamUpdate,
  MenuDomainService,
} from '@restaurant/frontend/domain/menu';

import { categoryConfig, dishConfig } from './menu-store.constants';
import { LoadStatus } from './menu-store.enums';
import { MenuState } from './menu-store.models';
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
    _menuDomainService: inject(MenuDomainService),
  })),
  withComputed(({ categoryEntities, dishEntities, _menuStoreService }) => ({
    sections: computed(() =>
      _menuStoreService.buildSections(categoryEntities(), dishEntities()),
    ),
  })),
  withMethods((store) => ({
    processMenuStream: rxMethod<MenuStreamUpdate>(
      tap((update) =>
        patchState(store, store._menuStoreService.menuStreamUpdater(update)),
      ),
    ),
    reloadMenu(): void {
      store._menuDomainService.reloadMenu();
    },
  })),
  withHooks({
    onInit(store) {
      store.processMenuStream(store._menuDomainService.streamMenu());
    },
  }),
);
