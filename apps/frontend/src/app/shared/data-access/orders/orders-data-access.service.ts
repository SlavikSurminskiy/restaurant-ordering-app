import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { IDEMPOTENCY_KEY_HEADER } from '@restaurant/shared-api-types';

import { CreateOrderRequest, Order } from './orders-data-access.models';

@Service()
export class OrdersDataAccessService {
  #http = inject(HttpClient);

  createOrder(request: CreateOrderRequest, idempotencyKey: string) {
    return this.#http.post<Order>('/api/orders', request, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    });
  }
}
