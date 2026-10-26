import type { NamedEntityState } from '@ngrx/signals/entities';

import type { Category, Dish, MenuEvent } from '@restaurant/shared-api-types';
import { MenuDomainModel } from '@restaurant/frontend/domain/menu';
import { SnapshotSyncUpdate } from '@restaurant/frontend/core/realtime';

import { LoadStatus } from './menu-store.enums';

export interface MenuState {
  status: LoadStatus;
  error: string | null;
}

export type MenuEntitiesState = NamedEntityState<Category, 'category'> &
  NamedEntityState<Dish, 'dish'>;

export type MenuUpdate = SnapshotSyncUpdate<MenuDomainModel, MenuEvent>;
