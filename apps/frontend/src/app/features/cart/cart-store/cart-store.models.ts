import { Money } from '@restaurant/shared-api-types';

export interface CartItem {
  dishId: string;
  name: string;
  unitPrice: Money;
  quantity: number;
}

export type NewCartItem = Omit<CartItem, 'quantity'>;

export interface CartState {
  /** One key per checkout attempt; any change to the cart drops it. */
  idempotencyKey: string | null;
}
