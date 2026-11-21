import { Prisma } from '@restaurant/database';

/** What `toOrder` needs to build the `Order` contract. */
export const ORDER_INCLUDE = {
  items: {
    select: {
      id: true,
      dishId: true,
      name: true,
      unitPrice: true,
      quantity: true,
    },
    orderBy: { name: 'asc' },
  },
  user: { select: { name: true } },
} satisfies Prisma.OrderInclude;

export type OrderRecord = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;
