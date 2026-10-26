import { OrderStatus } from '../generated/prisma/client';

export interface SeedOrderItem {
  dish: string;
  quantity: number;
}

export interface SeedOrder {
  idempotencyKey: string;
  userEmail: string;
  status: OrderStatus;
  minutesAgo: number;
  items: SeedOrderItem[];
}

export const orders: SeedOrder[] = [
  {
    idempotencyKey: 'seed-1',
    userEmail: 'customer@example.com',
    status: OrderStatus.NEW,
    minutesAgo: 1,
    items: [
      { dish: 'Margherita', quantity: 1 },
      { dish: 'Tiramisu', quantity: 2 },
    ],
  },
  {
    idempotencyKey: 'seed-2',
    userEmail: 'alice@example.com',
    status: OrderStatus.PREPARING,
    minutesAgo: 4,
    items: [
      { dish: 'Chicken Kyiv', quantity: 1 },
      { dish: 'Borscht', quantity: 1 },
    ],
  },
  {
    idempotencyKey: 'seed-3',
    userEmail: 'customer@example.com',
    status: OrderStatus.READY,
    minutesAgo: 9,
    items: [
      { dish: 'Chicken Caesar', quantity: 2 },
      { dish: 'French Onion Soup', quantity: 1 },
    ],
  },
  {
    idempotencyKey: 'seed-4',
    userEmail: 'alice@example.com',
    status: OrderStatus.COMPLETED,
    minutesAgo: 45,
    items: [
      { dish: 'Ribeye Steak', quantity: 1 },
      { dish: 'Greek Salad', quantity: 1 },
      { dish: 'New York Cheesecake', quantity: 1 },
    ],
  },
  {
    idempotencyKey: 'seed-5',
    userEmail: 'customer@example.com',
    status: OrderStatus.COMPLETED,
    minutesAgo: 120,
    items: [{ dish: 'Pepperoni', quantity: 2 }],
  },
  {
    idempotencyKey: 'seed-6',
    userEmail: 'customer@example.com',
    status: OrderStatus.CANCELLED,
    minutesAgo: 30,
    items: [
      { dish: 'Grilled Salmon', quantity: 1 },
      { dish: 'Pierogi', quantity: 1 },
    ],
  },
];
