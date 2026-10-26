import { OrderStatus } from '@restaurant/shared-api-types';

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  [OrderStatus.New]: 'New',
  [OrderStatus.Preparing]: 'Preparing',
  [OrderStatus.Ready]: 'Ready',
  [OrderStatus.Completed]: 'Completed',
  [OrderStatus.Cancelled]: 'Cancelled',
};

export const NEXT_STATUS_ACTIONS: Readonly<
  Partial<Record<OrderStatus, string>>
> = {
  [OrderStatus.Preparing]: 'Start preparing',
  [OrderStatus.Ready]: 'Mark as ready',
  [OrderStatus.Completed]: 'Complete',
};
