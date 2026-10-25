import { Injectable } from '@nestjs/common';

import {
  CreateOrderItemRequest,
  Dish,
  OrderConflict,
  OrderConflictReason,
} from '@restaurant/shared-api-types';

export type OrderedDish = Pick<
  Dish,
  'id' | 'name' | 'price' | 'isOpenPrice' | 'available'
>;

@Injectable()
export class OrderConflictsService {
  /** Why each item can't be ordered as the customer saw it; empty when the order can go ahead. */
  find(
    items: readonly CreateOrderItemRequest[],
    dishes: readonly OrderedDish[],
  ): OrderConflict[] {
    const byId = new Map(dishes.map((dish) => [dish.id, dish]));

    return items.flatMap(({ dishId, unitPrice }): OrderConflict[] => {
      const dish = byId.get(dishId);

      if (!dish) {
        return [
          { dishId, reason: OrderConflictReason.Removed, currentPrice: null },
        ];
      }

      if (!dish.available) {
        return [
          {
            dishId,
            reason: OrderConflictReason.Unavailable,
            currentPrice: null,
          },
        ];
      }

      // An open-price dish takes the price the customer entered.
      if (!dish.isOpenPrice && dish.price !== unitPrice) {
        return [
          {
            dishId,
            reason: OrderConflictReason.PriceChanged,
            currentPrice: dish.price,
          },
        ];
      }

      return [];
    });
  }
}
