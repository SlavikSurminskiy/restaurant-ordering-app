import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import {
  OrderConflictResponse,
  OrdersDataAccessService,
} from '@restaurant/frontend/data-access/orders';
import { ApiError } from '@restaurant/frontend/core/http';

import {
  CreateOrderResult,
  CreateOrderResultKind,
  CreateOrderDomainModel,
} from './orders-domain.models';

@Service()
export class OrdersDomainService {
  #ordersDataAccess = inject(OrdersDataAccessService);

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
}
