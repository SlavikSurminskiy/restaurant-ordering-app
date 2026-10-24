import { Category, Dish } from './menu';

export const MenuEventType = {
  CategoryUpserted: 'menu.category.upserted',
  CategoryDeleted: 'menu.category.deleted',
  DishUpserted: 'menu.dish.upserted',
  DishDeleted: 'menu.dish.deleted',
} as const;

export type MenuEventType = (typeof MenuEventType)[keyof typeof MenuEventType];

/** A category was created or changed; carries its full current state. */
export interface CategoryUpsertedEvent {
  type: typeof MenuEventType.CategoryUpserted;
  category: Category;
}

/** An empty category was deleted (categories with dishes can't be deleted). */
export interface CategoryDeletedEvent {
  type: typeof MenuEventType.CategoryDeleted;
  categoryId: string;
}

/** A dish was created or changed; carries its full current state. */
export interface DishUpsertedEvent {
  type: typeof MenuEventType.DishUpserted;
  dish: Dish;
}

/** A dish was deleted. */
export interface DishDeletedEvent {
  type: typeof MenuEventType.DishDeleted;
  dishId: string;
}

export type MenuEvent =
  | CategoryUpsertedEvent
  | CategoryDeletedEvent
  | DishUpsertedEvent
  | DishDeletedEvent;

/**
 * `data` of a default `message` event on `GET /api/events` (SSE).
 * Heartbeats are SSE comments, which `EventSource` ignores.
 */
export type ServerEvent = MenuEvent;
