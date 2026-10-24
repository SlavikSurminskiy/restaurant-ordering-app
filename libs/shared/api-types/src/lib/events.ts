import { Category, Dish } from './menu';

/** A category was created or changed; carries its full current state. */
export interface CategoryUpsertedEvent {
  type: 'menu.category.upserted';
  category: Category;
}

/** An empty category was deleted (categories with dishes can't be deleted). */
export interface CategoryDeletedEvent {
  type: 'menu.category.deleted';
  categoryId: string;
}

/** A dish was created or changed; carries its full current state. */
export interface DishUpsertedEvent {
  type: 'menu.dish.upserted';
  dish: Dish;
}

/** A dish was deleted. */
export interface DishDeletedEvent {
  type: 'menu.dish.deleted';
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
