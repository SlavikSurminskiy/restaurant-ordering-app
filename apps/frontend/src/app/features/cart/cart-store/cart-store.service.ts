import { Service } from '@angular/core';
import { EntityChanges } from '@ngrx/signals/entities';

import { OrderConflictReason } from '@restaurant/shared-api-types';
import { OrderConflictDomainModel } from '@restaurant/frontend/domain/orders';

import { CartItem, NewCartItem } from './cart-store.models';

@Service()
export class CartStoreService {
  added(existing: CartItem | undefined, item: NewCartItem): CartItem {
    return { ...item, quantity: (existing?.quantity ?? 0) + 1 };
  }

  resolved(conflicts: readonly OrderConflictDomainModel[]): {
    repriced: { id: string; changes: EntityChanges<CartItem> }[];
    removedIds: string[];
  } {
    return {
      repriced: conflicts.flatMap(({ dishId, reason, currentPrice }) =>
        reason === OrderConflictReason.PriceChanged && currentPrice !== null
          ? [{ id: dishId, changes: { unitPrice: currentPrice } }]
          : [],
      ),
      removedIds: conflicts
        .filter(({ reason }) => reason !== OrderConflictReason.PriceChanged)
        .map(({ dishId }) => dishId),
    };
  }
}
