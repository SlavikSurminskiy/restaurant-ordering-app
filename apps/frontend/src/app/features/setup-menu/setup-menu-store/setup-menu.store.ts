import { computed, inject } from '@angular/core';
import {
  withProps,
  signalStore,
  withMethods,
  withComputed,
} from '@ngrx/signals';

import { MenuDomainModel } from '../../../shared/domain/menu/menu-domain.models';

import { withCategories } from './categories-store-feature/categories-store-feature';
import { withDishes } from './dishes-store-feature/dishes-store-feature';
import { SetupMenuStoreService } from './setup-menu-store.service';

export const SetupMenuStore = signalStore(
  withCategories(),
  withDishes(),
  withProps(() => ({
    _setupStoreService: inject(SetupMenuStoreService),
  })),
  withComputed(({ categoryEntities, dishEntities, _setupStoreService }) => ({
    sections: computed(() =>
      _setupStoreService.buildSections(categoryEntities(), dishEntities()),
    ),
  })),
  withMethods((store) => ({
    setMenu({ categories, dishes }: MenuDomainModel): void {
      store.setCategories(categories);
      store.setDishes(dishes);
    },
  })),
);
