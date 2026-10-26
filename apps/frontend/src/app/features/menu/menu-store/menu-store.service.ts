import { Service } from '@angular/core';
import type { PartialStateUpdater } from '@ngrx/signals';
import {
  setEntity,
  removeEntity,
  setAllEntities,
} from '@ngrx/signals/entities';

import {
  MenuEventType,
  type Category,
  type Dish,
  type MenuEvent,
} from '@restaurant/shared-api-types';
import {
  MenuStreamUpdate,
  MenuSectionDomainModel,
} from '@restaurant/frontend/domain/menu';
import { LiveResourceUpdateKind } from '@restaurant/frontend/domain/sse';
import { errorMessage } from '@restaurant/frontend/core/http';

import { dishConfig, categoryConfig } from './menu-store.constants';
import { LoadStatus } from './menu-store.enums';
import { MenuEntitiesState, MenuStoreState } from './menu-store.models';

@Service()
export class MenuStoreService {
  buildSections(
    categories: Category[],
    dishes: Dish[],
  ): MenuSectionDomainModel[] {
    const dishesByCategory = new Map<string, Dish[]>(
      categories.map((category) => [category.id, []]),
    );

    for (const dish of dishes) {
      dishesByCategory.get(dish.categoryId)?.push(dish);
    }

    return categories.map((category) => ({
      category,
      dishes: dishesByCategory.get(category.id) ?? [],
    }));
  }

  menuStreamUpdater(
    update: MenuStreamUpdate,
  ): PartialStateUpdater<MenuStoreState> {
    switch (update.kind) {
      case LiveResourceUpdateKind.Snapshot:
        return (state) => ({
          ...setAllEntities(update.snapshot.categories, categoryConfig)(state),
          ...setAllEntities(update.snapshot.dishes, dishConfig)(state),
          status: LoadStatus.Loaded,
          error: null,
        });
      case LiveResourceUpdateKind.SnapshotFailed:
        // A shown menu stays on screen while the reload is retried.
        return (state) =>
          state.status === LoadStatus.Loaded
            ? {}
            : { status: LoadStatus.Error, error: errorMessage(update.error) };
      case LiveResourceUpdateKind.Event:
        return this.#eventUpdater(update.event);
    }
  }

  #eventUpdater(event: MenuEvent): PartialStateUpdater<MenuEntitiesState> {
    switch (event.type) {
      case MenuEventType.CategoryUpserted:
        return setEntity(event.category, categoryConfig);
      case MenuEventType.CategoryDeleted:
        return removeEntity(event.categoryId, categoryConfig);
      case MenuEventType.DishUpserted:
        return setEntity(event.dish, dishConfig);
      case MenuEventType.DishDeleted:
        return removeEntity(event.dishId, dishConfig);
    }
  }
}
