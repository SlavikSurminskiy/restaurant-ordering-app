import { Order } from '@restaurant/shared-api-types';

import { OrderRecord } from './orders.constants';

export function toOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    userId: record.userId,
    userName: record.user.name,
    status: record.status,
    items: record.items,
    subtotal: record.subtotal,
    discount: record.discount,
    total: record.total,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
