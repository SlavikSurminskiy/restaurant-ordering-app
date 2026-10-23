import { Category, Dish } from '@restaurant/shared-api-types';

export const MenuRowKind = {
  Category: 'category',
  Dish: 'dish',
} as const;

export type MenuRowKind = (typeof MenuRowKind)[keyof typeof MenuRowKind];

export type MenuRow =
  | { kind: typeof MenuRowKind.Category; category: Category }
  | { kind: typeof MenuRowKind.Dish; dish: Dish };
