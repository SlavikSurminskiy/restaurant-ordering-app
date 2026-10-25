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
  type ServerEvent,
} from '@restaurant/shared-api-types';
import { MenuDomainService } from '../../../shared/domain/menu/menu-domain.service';
import { MenuSectionDomainModel } from '../../../shared/domain/menu/menu-domain.models';
import { SseService } from '../../../core/realtime/sse.service';
import { retryWithBackoff } from '../../../core/realtime/utils/retry-with-backoff';

import {
  dishConfig,
  categoryConfig,
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

  eventUpdater(event: ServerEvent): PartialStateUpdater<MenuEntitiesState> {
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

    const toUpdate = (event: ServerEvent): MenuUpdate => ({
      kind: MenuUpdateKind.Event,
      event,
    });

    const bufferedEvents$ = this.#sseService.events$.pipe(
      buffer(isSnapshotLoaded$),
      take(1),
      mergeAll(),
      map(toUpdate),
    );

    const liveEvents$ = this.#sseService.events$.pipe(
      skipUntil(isSnapshotLoaded$),
      map(toUpdate),
    );

    return merge(snapshot$, bufferedEvents$, liveEvents$);
  }
}
