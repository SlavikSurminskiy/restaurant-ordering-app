import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import type { Category, Dish } from '@restaurant/shared-api-types';

export const categoryConfig = entityConfig({
  entity: type<Category>(),
  collection: 'category',
});

export const dishConfig = entityConfig({
  entity: type<Dish>(),
  collection: 'dish',
});

/** Load the menu without live updates if the event stream hasn't opened by then. */
export const SNAPSHOT_FALLBACK_DELAY_MS = 5000;
