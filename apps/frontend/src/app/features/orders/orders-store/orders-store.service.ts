import { Service } from '@angular/core';
import type { PartialStateUpdater } from '@ngrx/signals';
import { setAllEntities, setEntity } from '@ngrx/signals/entities';

import {
  OrderDomainModel,
  OrderStreamUpdate,
} from '@restaurant/frontend/domain/orders';
import { LiveResourceUpdateKind } from '@restaurant/frontend/domain/sse';
import { errorMessage } from '@restaurant/frontend/core/http';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

import { orderConfig } from './orders-store.constants';
import { OrdersEntitiesState, OrdersStoreState } from './orders-store.models';

@Service()
export class OrdersStoreService {
  /** Newest first, like the server's list. */
  sortNewestFirst(orders: OrderDomainModel[]): OrderDomainModel[] {
    return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  ordersStreamUpdater(
    update: OrderStreamUpdate,
  ): PartialStateUpdater<OrdersStoreState> {
    switch (update.kind) {
      case LiveResourceUpdateKind.Snapshot:
        return (state) => ({
          ...setAllEntities(update.snapshot, orderConfig)(state),
          status: LoadStatus.Loaded,
          error: null,
        });
      case LiveResourceUpdateKind.SnapshotFailed:
        // Shown orders stay on screen while the reload is retried.
        return (state) =>
          state.status === LoadStatus.Loaded
            ? {}
            : { status: LoadStatus.Error, error: errorMessage(update.error) };
      case LiveResourceUpdateKind.Event:
        return this.orderUpdater(update.event.order);
    }
  }

  /** An event and the answer to a status change can arrive in either order; the later state wins. */
  orderUpdater(
    order: OrderDomainModel,
  ): PartialStateUpdater<OrdersEntitiesState> {
    return (state) => {
      const current = state.orderEntityMap[order.id];

      return !current || order.updatedAt >= current.updatedAt
        ? setEntity(order, orderConfig)(state)
        : {};
    };
  }
}
