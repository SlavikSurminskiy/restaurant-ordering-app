import { Service } from '@angular/core';

import { OrderStatus } from '@restaurant/shared-api-types';
import { OrderDomainModel } from '@restaurant/frontend/domain/orders';

import { OrderCardModel } from './orders.models';

const SEQUENCE: readonly OrderStatus[] = [
  OrderStatus.New,
  OrderStatus.Preparing,
  OrderStatus.Ready,
  OrderStatus.Completed,
];

@Service()
export class OrdersService {
  buildCards(orders: readonly OrderDomainModel[]): OrderCardModel[] {
    return orders.map((order) => ({
      order,
      nextStatus: this.#nextStatus(order.status),
    }));
  }

  #nextStatus(status: OrderStatus): OrderStatus | null {
    const index = SEQUENCE.indexOf(status);

    return index >= 0 ? (SEQUENCE[index + 1] ?? null) : null;
  }
}
