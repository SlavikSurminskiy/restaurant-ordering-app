import { Service } from '@angular/core';

import { Dish, OrderConflictReason } from '@restaurant/shared-api-types';
import {
  CreateOrderDomainModel,
  OrderConflictDomainModel,
} from '@restaurant/frontend/domain/orders';

import { CartLineModel } from './cart.models';
import { CartItem } from './cart-store/cart-store.models';
import { CartWarning } from './cart-warning/cart-warning.models';

@Service()
export class CartService {
  findWarnings(
    items: readonly CartItem[],
    dishes: Readonly<Record<string, Dish>>,
  ): CartWarning[] {
    return items.flatMap(({ dishId, name, unitPrice }): CartWarning[] => {
      const dish = dishes[dishId];

      if (!dish) {
        return [
          {
            dishId,
            name,
            reason: OrderConflictReason.Removed,
            currentPrice: null,
          },
        ];
      }

      if (!dish.available) {
        return [
          {
            dishId,
            name,
            reason: OrderConflictReason.Unavailable,
            currentPrice: null,
          },
        ];
      }

      if (!dish.isOpenPrice && dish.price !== unitPrice) {
        return [
          {
            dishId,
            name,
            reason: OrderConflictReason.PriceChanged,
            currentPrice: dish.price,
          },
        ];
      }

      return [];
    });
  }

  namedConflicts(
    conflicts: readonly OrderConflictDomainModel[],
    items: Readonly<Record<string, CartItem>>,
  ): CartWarning[] {
    return conflicts.map((conflict) => ({
      ...conflict,
      name: items[conflict.dishId]?.name ?? 'A dish',
    }));
  }

  buildLines(
    items: readonly CartItem[],
    dishes: Readonly<Record<string, Dish>>,
    warnings: readonly CartWarning[],
  ): CartLineModel[] {
    const warningsById = new Map(
      warnings.map((warning) => [warning.dishId, warning]),
    );

    return items.map((item) => ({
      item,
      isOpenPrice: dishes[item.dishId]?.isOpenPrice ?? false,
      total: item.unitPrice * item.quantity,
      warning: warningsById.get(item.dishId) ?? null,
    }));
  }

  toRequest(items: readonly CartItem[]): CreateOrderDomainModel {
    return {
      items: items.map(({ dishId, quantity, unitPrice }) => ({
        dishId,
        quantity,
        unitPrice,
      })),
    };
  }
}
