import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { IDEMPOTENCY_KEY_HEADER } from '@restaurant/shared-api-types';

import {
  Order,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
} from './orders-data-access.models';

@Service()
export class OrdersDataAccessService {
  #http = inject(HttpClient);

  getOrders() {
    return this.#http.get<Order[]>('/api/orders');
  }

  updateOrderStatus(id: string, request: UpdateOrderStatusRequest) {
    return this.#http.patch<Order>(`/api/orders/${id}/status`, request);
  }

  createOrder(request: CreateOrderRequest, idempotencyKey: string) {
    return this.#http.post<Order>('/api/orders', request, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    });
  }
}
