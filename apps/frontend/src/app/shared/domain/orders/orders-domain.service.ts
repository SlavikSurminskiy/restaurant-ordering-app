import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  of,
  map,
  filter,
  Subject,
  throwError,
  catchError,
  Observable,
} from 'rxjs';

import type { OrderEvent, ServerEvent } from '@restaurant/shared-api-types';
import {
  OrderConflictResponse,
  OrdersDataAccessService,
} from '@restaurant/frontend/data-access/orders';
import { ApiError } from '@restaurant/frontend/core/http';
import { SseDataAccessService } from '@restaurant/frontend/data-access/sse';
import { LiveResourceFactoryService } from '@restaurant/frontend/domain/sse';

import { ORDER_EVENT_TYPES } from './orders-domain.constants';

import {
  OrderDomainModel,
  OrderStreamUpdate,
  CreateOrderResult,
  OrderStatusDomainModel,
  CreateOrderResultKind,
  CreateOrderDomainModel,
} from './orders-domain.models';

@Service()
export class OrdersDomainService {
  #ordersDataAccess = inject(OrdersDataAccessService);
  #sseDataAccess = inject(SseDataAccessService);
  #liveResourceFactory = inject(LiveResourceFactoryService);
  #reloadRequests = new Subject<void>();

  getOrders(): Observable<OrderDomainModel[]> {
    return this.#ordersDataAccess.getOrders();
  }

  streamOrders(): Observable<OrderStreamUpdate> {
    return this.#liveResourceFactory.create({
      loadSnapshot: () => this.getOrders(),
      events$: this.#sseDataAccess
        .serverEvents()
        .pipe(filter((event) => this.#isOrderEvent(event))),
      reload$: this.#reloadRequests,
    });
  }

  reloadOrders(): void {
    this.#reloadRequests.next();
  }

  updateOrderStatus(
    id: string,
    status: OrderStatusDomainModel,
  ): Observable<OrderDomainModel> {
    return this.#ordersDataAccess.updateOrderStatus(id, { status });
  }

  createOrder(
    request: CreateOrderDomainModel,
    idempotencyKey: string,
  ): Observable<CreateOrderResult> {
    return this.#ordersDataAccess.createOrder(request, idempotencyKey).pipe(
      map((order): CreateOrderResult => ({
        kind: CreateOrderResultKind.Created,
        order,
      })),
      catchError((error: unknown) =>
        this.#isConflict(error)
          ? of<CreateOrderResult>({
              kind: CreateOrderResultKind.Conflicts,
              conflicts: error.body.conflicts,
            })
          : throwError(() => error),
      ),
    );
  }

  #isConflict(
    error: unknown,
  ): error is ApiError & { body: OrderConflictResponse } {
    return (
      error instanceof ApiError &&
      error.status === HttpStatusCode.Conflict &&
      Array.isArray((error.body as Partial<OrderConflictResponse>)?.conflicts)
    );
  }

  #isOrderEvent(event: ServerEvent): event is OrderEvent {
    return ORDER_EVENT_TYPES.includes(event.type);
  }
}
