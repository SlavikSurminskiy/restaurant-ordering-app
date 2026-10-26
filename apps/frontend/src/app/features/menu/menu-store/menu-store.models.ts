import type { NamedEntityState } from '@ngrx/signals/entities';

import type { Category, Dish } from '@restaurant/shared-api-types';

import { LoadStatus } from './menu-store.enums';

export interface MenuState {
  status: LoadStatus;
  error: string | null;
}

export type MenuEntitiesState = NamedEntityState<Category, 'category'> &
  NamedEntityState<Dish, 'dish'>;

export type MenuStoreState = MenuState & MenuEntitiesState;
