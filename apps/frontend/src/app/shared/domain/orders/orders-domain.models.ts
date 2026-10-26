import type {
  Order,
  OrderEvent,
  OrderStatus,
  OrderConflict,
  CreateOrderRequest,
} from '@restaurant/shared-api-types';
import { LiveResourceUpdate } from '@restaurant/frontend/domain/sse';

export type OrderDomainModel = Order;

export type OrderStatusDomainModel = OrderStatus;

export type OrderConflictDomainModel = OrderConflict;

export type CreateOrderDomainModel = CreateOrderRequest;

export const CreateOrderResultKind = {
  Created: 'created',
  Conflicts: 'conflicts',
} as const;

export type CreateOrderResultKind =
  (typeof CreateOrderResultKind)[keyof typeof CreateOrderResultKind];

export type CreateOrderResult =
  | { kind: typeof CreateOrderResultKind.Created; order: OrderDomainModel }
  | {
      kind: typeof CreateOrderResultKind.Conflicts;
      conflicts: OrderConflictDomainModel[];
    };

export type OrderStreamUpdate = LiveResourceUpdate<
  OrderDomainModel[],
  OrderEvent
>;
