import { Money, Order } from '@restaurant/shared-api-types';

export type OrderTotals = Pick<Order, 'subtotal' | 'discount' | 'total'>;

export interface PricedItem {
  unitPrice: Money;
  quantity: number;
}

/** The discount never takes the total below zero. */
export function calculateTotals(
  items: readonly PricedItem[],
  discount: Money,
): OrderTotals {
  const subtotal = items.reduce(
    (sum, { unitPrice, quantity }) => sum + unitPrice * quantity,
    0,
  );
  const applied = Math.min(discount, subtotal);

  return { subtotal, discount: applied, total: subtotal - applied };
}
