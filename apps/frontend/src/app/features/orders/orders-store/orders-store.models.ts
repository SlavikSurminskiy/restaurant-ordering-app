import type { NamedEntityState } from '@ngrx/signals/entities';

import { OrderDomainModel } from '@restaurant/frontend/domain/orders';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

export interface OrdersState {
  status: LoadStatus;
  error: string | null;
}

export type OrdersEntitiesState = NamedEntityState<OrderDomainModel, 'order'>;

export type OrdersStoreState = OrdersState & OrdersEntitiesState;
