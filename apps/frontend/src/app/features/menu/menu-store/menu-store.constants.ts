import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import { Category, Dish, MenuEventType } from '@restaurant/shared-api-types';

export const categoryConfig = entityConfig({
  entity: type<Category>(),
  collection: 'category',
});

export const dishConfig = entityConfig({
  entity: type<Dish>(),
  collection: 'dish',
});

export const MENU_EVENT_TYPES: readonly string[] = Object.values(MenuEventType);
