import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import type { OrderEvent, ServerEvent } from '@restaurant/shared-api-types';
import {
  OrderDomainModel,
  OrdersDomainService,
} from '@restaurant/frontend/domain/orders';
import { SnapshotSyncService } from '@restaurant/frontend/core/realtime';

import { ORDER_EVENT_TYPES } from './orders-store.constants';
import { OrderUpdate } from './orders-store.models';

@Service()
export class OrdersStoreService {
  readonly #ordersDomainService = inject(OrdersDomainService);
  readonly #snapshotSyncService = inject(SnapshotSyncService);

  orderUpdates(): Observable<OrderUpdate> {
    return this.#snapshotSyncService.sync({
      loadSnapshot: () => this.#ordersDomainService.getOrders(),
      isEvent: (event): event is OrderEvent => this.#isOrderEvent(event),
    });
  }

  /** Newest first, like the server's list. */
  sortNewestFirst(orders: OrderDomainModel[]): OrderDomainModel[] {
    return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** An event and the answer to a status change can arrive in either order; the later state wins. */
  isNewer(
    order: OrderDomainModel,
    current: OrderDomainModel | undefined,
  ): boolean {
    return !current || order.updatedAt >= current.updatedAt;
  }

  #isOrderEvent(event: ServerEvent): event is OrderEvent {
    return ORDER_EVENT_TYPES.includes(event.type);
  }
}
