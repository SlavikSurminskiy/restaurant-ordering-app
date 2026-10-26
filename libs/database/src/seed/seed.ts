import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

import { menu } from './menu';
import { orders } from './orders';
import { users } from './users';
import { hashPassword } from '../lib/password';

// Run via `pnpm db:seed`: Nx loads .env and `prisma db seed` passes it on.
const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL is not set (run via `pnpm db:seed`)');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedUsers(): Promise<void> {
  for (const { email, name, password, role } of users) {
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash, role },
      create: { email, name, passwordHash, role },
    });
  }
}

async function seedMenu(): Promise<boolean> {
  if ((await prisma.category.count()) > 0) {
    return false;
  }

  // The menu is ordered by createdAt, and now() is the same for the whole
  // transaction, so each row gets its own millisecond in seed order.
  const startedAt = Date.now();
  let position = 0;
  const nextCreatedAt = () => new Date(startedAt + position++);

  await prisma.$transaction(async (tx) => {
    for (const category of menu) {
      const { id: categoryId } = await tx.category.create({
        data: { name: category.name, createdAt: nextCreatedAt() },
      });
      await tx.dish.createMany({
        data: category.dishes.map((dish) => ({
          categoryId,
          name: dish.name,
          description: dish.description,
          photoUrl: dish.photo
            ? `/dishes/${category.slug}/${dish.photo}.jpg`
            : null,
          price: dish.price,
          isOpenPrice: dish.price === null,
          available: dish.available ?? true,
          createdAt: nextCreatedAt(),
        })),
      });
    }
  });

  return true;
}

function orderDiscount(): number {
  const discount = Number(process.env['ORDER_DISCOUNT'] ?? 0);

  return Number.isInteger(discount) && discount > 0 ? discount : 0;
}

/**
 * Puts the demo orders back to their seeded status and time on every run, so
 * the orders page starts with every status; the backend timer then moves the
 * active ones on live.
 */
async function seedOrders(): Promise<void> {
  const now = Date.now();
  const discount = orderDiscount();

  for (const order of orders) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: order.userEmail },
    });
    const items = await Promise.all(
      order.items.map(async ({ dish: name, quantity }) => {
        const dish = await prisma.dish.findFirstOrThrow({ where: { name } });

        if (dish.price === null) {
          throw new Error(`Seed order dish ${name} has no fixed price`);
        }

        return { dishId: dish.id, name, unitPrice: dish.price, quantity };
      }),
    );
    const subtotal = items.reduce(
      (sum, { unitPrice, quantity }) => sum + unitPrice * quantity,
      0,
    );
    const applied = Math.min(discount, subtotal);
    const data = {
      status: order.status,
      subtotal,
      discount: applied,
      total: subtotal - applied,
      createdAt: new Date(now - order.minutesAgo * 60_000),
    };

    await prisma.order.upsert({
      where: {
        userId_idempotencyKey: {
          userId: user.id,
          idempotencyKey: order.idempotencyKey,
        },
      },
      update: { ...data, items: { deleteMany: {}, create: items } },
      create: {
        ...data,
        userId: user.id,
        idempotencyKey: order.idempotencyKey,
        items: { create: items },
      },
    });
  }
}

async function main(): Promise<void> {
  await seedUsers();

  const menuSeeded = await seedMenu();
  await seedOrders();

  console.log(
    `Seed finished: ${users.length} users, menu ${menuSeeded ? 'created' : 'already present, left unchanged'}, ${orders.length} demo orders reset.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
