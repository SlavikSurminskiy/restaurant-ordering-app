import { Money } from './money';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

export const OrderStatus = {
  New: 'NEW',
  Preparing: 'PREPARING',
  Ready: 'READY',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export interface OrderItem {
  id: string;
  dishId: string | null;
  name: string;
  unitPrice: Money;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: Money;
  discount: Money;
  total: Money;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItemRequest {
  dishId: string;
  quantity: number;
  unitPrice: Money;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
}

export const OrderConflictReason = {
  PriceChanged: 'price-changed',
  Unavailable: 'unavailable',
  Removed: 'removed',
} as const;

export type OrderConflictReason =
  (typeof OrderConflictReason)[keyof typeof OrderConflictReason];

export interface OrderConflict {
  dishId: string;
  reason: OrderConflictReason;
  currentPrice: Money | null;
}

/** Body of `409 Conflict` from `POST /api/orders`: nothing was ordered. */
export interface OrderConflictResponse {
  conflicts: OrderConflict[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}
