import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import { CartItem } from './cart-store.models';

export const cartItemConfig = entityConfig({
  entity: type<CartItem>(),
  collection: 'item',
  selectId: (item) => item.dishId,
});

export const CART_STORAGE_KEY = 'cart';
