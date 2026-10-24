import type { NamedEntityState } from '@ngrx/signals/entities';

import type { Category, Dish, ServerEvent } from '@restaurant/shared-api-types';

import { MenuDomainModel } from '../../../shared/domain/domain.models';

import { LoadStatus, MenuUpdateKind } from './menu-store.enums';

export interface MenuState {
  status: LoadStatus;
  error: string | null;
}

export type MenuEntitiesState = NamedEntityState<Category, 'category'> &
  NamedEntityState<Dish, 'dish'>;

export type MenuUpdate =
  | { kind: typeof MenuUpdateKind.Snapshot; menu: MenuDomainModel }
  | { kind: typeof MenuUpdateKind.SnapshotFailed; error: unknown }
  | { kind: typeof MenuUpdateKind.Event; event: ServerEvent };
