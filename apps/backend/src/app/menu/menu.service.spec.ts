import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Test } from '@nestjs/testing';

import { Prisma, PrismaService, Category, Dish } from '@restaurant/database';

import { MenuService } from './menu.service';

describe('MenuService', () => {
  it('should return categories and dishes read inside the transaction', async () => {
    const { categories, dishes } = Arrange.createMenu();
    const { tx, prismaMock } = Arrange.createSpies({ categories, dishes });
    const service = await Arrange.setup({ prismaMock });

    await expect(service.getMenu()).resolves.toEqual({ categories, dishes });

    expect(tx.dish.findMany).toHaveBeenCalledOnce();
    expect(tx.category.findMany).toHaveBeenCalledOnce();
  });

  it('should read both tables in one repeatable-read transaction', async () => {
    const { prismaMock } = Arrange.createSpies(Arrange.createMenu());
    const service = await Arrange.setup({ prismaMock });

    await service.getMenu();

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  });

  it('should order categories and dishes by creation time', async () => {
    const { tx, prismaMock } = Arrange.createSpies(Arrange.createMenu());
    const service = await Arrange.setup({ prismaMock });

    await service.getMenu();

    const byCreatedAt = expect.objectContaining({
      orderBy: { createdAt: 'asc' },
    });

    expect(tx.dish.findMany).toHaveBeenCalledWith(byCreatedAt);
    expect(tx.category.findMany).toHaveBeenCalledWith(byCreatedAt);
  });
});

interface Spies {
  prismaMock: { $transaction: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: spies.prismaMock },
      ],
    }).compile();

    return moduleRef.get(MenuService);
  },

  createSpies(params: { categories: Category[]; dishes: Dish[] }) {
    const tx = {
      category: { findMany: vi.fn().mockResolvedValue(params.categories) },
      dish: { findMany: vi.fn().mockResolvedValue(params.dishes) },
    };

    const prismaMock = {
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    };

    return {
      tx,
      prismaMock,
    };
  },

  createMenu() {
    const categoryId = '0b9c6a3e-4f4f-4d8e-9a57-5f3a3c1f2b10';

    const categories: Category[] = [
      {
        id: categoryId,
        name: 'Soups',
        createdAt: new Date(),
      },
    ];

    const dishes: Dish[] = [
      {
        id: '7d2f1c84-1e7b-4a59-8c39-2b6e9f0d4a21',
        categoryId,
        name: 'Borscht',
        description: '',
        photoUrl: null,
        price: 13500,
        isOpenPrice: false,
        available: true,
        createdAt: new Date(),
      },
    ];

    return {
      dishes,
      categories,
    };
  },
};
