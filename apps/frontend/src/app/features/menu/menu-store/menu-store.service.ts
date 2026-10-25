import { inject, Service } from '@angular/core';
import type { PartialStateUpdater } from '@ngrx/signals';
import { removeEntity, setEntity } from '@ngrx/signals/entities';
import {
  of,
  map,
  take,
  timer,
  merge,
  buffer,
  concat,
  filter,
  mergeAll,
  takeUntil,
  skipUntil,
  switchMap,
  throwError,
  Observable,
  shareReplay,
  catchError,
} from 'rxjs';

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
import {
  SseService,
  retryWithBackoff,
} from '@restaurant/frontend/core/realtime';

import {
  dishConfig,
  categoryConfig,
  MENU_EVENT_TYPES,
  SNAPSHOT_FALLBACK_DELAY_MS,
} from './menu-store.constants';
import { MenuUpdateKind } from './menu-store.enums';
import { MenuEntitiesState, MenuUpdate } from './menu-store.models';

@Service()
export class MenuStoreService {
  readonly #menuDomainService = inject(MenuDomainService);
  readonly #sseService = inject(SseService);

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
    return this.#snapshotTriggers().pipe(
      switchMap(() => this.#snapshotThenEvents()),
    );
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

  #snapshotTriggers(): Observable<unknown> {
    const opened$ = this.#sseService.opened$;

    // If opened$ doesn't emit within the delay (e.g. proxy block).
    // Waits for SNAPSHOT_FALLBACK_DELAY_MS and triggers the fallback if opened$ hasn't fired yet.
    return merge(
      opened$,
      timer(SNAPSHOT_FALLBACK_DELAY_MS).pipe(takeUntil(opened$)),
    );
  }

  #snapshotThenEvents(): Observable<MenuUpdate> {
    const snapshot$ = this.#menuDomainService.getMenu().pipe(
      map((menu): MenuUpdate => ({ kind: MenuUpdateKind.Snapshot, menu })),
      catchError((error: unknown) =>
        concat(
          of<MenuUpdate>({ kind: MenuUpdateKind.SnapshotFailed, error }),
          throwError(() => error),
        ),
      ),
      retryWithBackoff(),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    const isSnapshotLoaded$ = snapshot$.pipe(
      filter(({ kind }) => kind === MenuUpdateKind.Snapshot),
    );

    const toUpdate = (event: MenuEvent): MenuUpdate => ({
      kind: MenuUpdateKind.Event,
      event,
    });

    // The stream also carries order events; the menu needs only its own.
    const menuEvents$ = this.#sseService.events$.pipe(
      filter((event) => this.#isMenuEvent(event)),
    );

    const bufferedEvents$ = menuEvents$.pipe(
      buffer(isSnapshotLoaded$),
      take(1),
      mergeAll(),
      map(toUpdate),
    );

    const liveEvents$ = menuEvents$.pipe(
      skipUntil(isSnapshotLoaded$),
      map(toUpdate),
    );

    return merge(snapshot$, bufferedEvents$, liveEvents$);
  }

  #isMenuEvent(event: ServerEvent): event is MenuEvent {
    return MENU_EVENT_TYPES.includes(event.type);
  }
}
