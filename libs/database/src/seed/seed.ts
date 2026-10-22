import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

import { menu } from './menu';
import { users } from './users';
import { hashPassword } from './password';

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
        data: category.dishes.map((dish, index) => ({
          categoryId,
          name: dish.name,
          description: dish.description,
          // Every other dish has a photo, to show both states in the UI.
          photoUrl: index % 2 === 0 ? `/dishes/${category.photo}.jpg` : null,
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

async function main(): Promise<void> {
  await seedUsers();

  const menuSeeded = await seedMenu();

  console.log(
    `Seed finished: ${users.length} users, menu ${menuSeeded ? 'created' : 'already present, left unchanged'}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
