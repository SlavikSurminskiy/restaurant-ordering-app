import { Prisma } from '@restaurant/database';

export const CATEGORY_SELECT = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

export const DISH_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  photoUrl: true,
  price: true,
  isOpenPrice: true,
  available: true,
} satisfies Prisma.DishSelect;
