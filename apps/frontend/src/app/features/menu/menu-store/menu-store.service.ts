import { inject, Service } from '@angular/core';
import type { PartialStateUpdater } from '@ngrx/signals';
import { removeEntity, setEntity } from '@ngrx/signals/entities';
import { Observable, Subject } from 'rxjs';

import {
  MenuEventType,
  type Category,
  type Dish,
  type MenuEvent,
  type ServerEvent,
} from '@restaurant/shared-api-types';
import {
  MenuDomainService,
  MenuSectionDomainModel,
} from '@restaurant/frontend/domain/menu';
import { SnapshotSyncService } from '@restaurant/frontend/core/realtime';

import {
  dishConfig,
  categoryConfig,
  MENU_EVENT_TYPES,
} from './menu-store.constants';
import { MenuEntitiesState, MenuUpdate } from './menu-store.models';

@Service()
export class MenuStoreService {
  readonly #menuDomainService = inject(MenuDomainService);
  readonly #snapshotSyncService = inject(SnapshotSyncService);
  readonly #reloadRequests = new Subject<void>();

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

  menuUpdates(): Observable<MenuUpdate> {
    return this.#snapshotSyncService.sync({
      loadSnapshot: () => this.#menuDomainService.getMenu(),
      isEvent: (event): event is MenuEvent => this.#isMenuEvent(event),
      reload$: this.#reloadRequests,
    });
  }

  reload(): void {
    this.#reloadRequests.next();
  }

  eventUpdater(event: MenuEvent): PartialStateUpdater<MenuEntitiesState> {
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

  #isMenuEvent(event: ServerEvent): event is MenuEvent {
    return MENU_EVENT_TYPES.includes(event.type);
  }
}
