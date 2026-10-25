import { Category, Dish } from './menu';
import { Order } from './orders';

export const MenuEventType = {
  CategoryUpserted: 'menu.category.upserted',
  CategoryDeleted: 'menu.category.deleted',
  DishUpserted: 'menu.dish.upserted',
  DishDeleted: 'menu.dish.deleted',
} as const;

export type MenuEventType = (typeof MenuEventType)[keyof typeof MenuEventType];

export interface CategoryUpsertedEvent {
  type: typeof MenuEventType.CategoryUpserted;
  category: Category;
}

export interface CategoryDeletedEvent {
  type: typeof MenuEventType.CategoryDeleted;
  categoryId: string;
}

export interface DishUpsertedEvent {
  type: typeof MenuEventType.DishUpserted;
  dish: Dish;
}

export interface DishDeletedEvent {
  type: typeof MenuEventType.DishDeleted;
  dishId: string;
}

export const OrderEventType = {
  Created: 'order.created',
  Updated: 'order.updated',
} as const;

export type OrderEventType =
  (typeof OrderEventType)[keyof typeof OrderEventType];

export interface OrderCreatedEvent {
  type: typeof OrderEventType.Created;
  order: Order;
}

export interface OrderUpdatedEvent {
  type: typeof OrderEventType.Updated;
  order: Order;
}

export type OrderEvent = OrderCreatedEvent | OrderUpdatedEvent;

export type MenuEvent =
  | CategoryUpsertedEvent
  | CategoryDeletedEvent
  | DishUpsertedEvent
  | DishDeletedEvent;

/**
 * `data` of a default `message` event on `GET /api/events` (SSE).
 * Heartbeats are SSE comments, which `EventSource` ignores.
 */
export type ServerEvent = MenuEvent | OrderEvent;
