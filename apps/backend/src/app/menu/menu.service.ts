import { Injectable } from '@nestjs/common';

import { PrismaService, Prisma } from '@restaurant/database';
import { MenuResponse } from '@restaurant/shared-api-types';

import { CATEGORY_SELECT, DISH_SELECT } from './menu.constants';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(): Promise<MenuResponse> {
    const { categories, dishes } = await this.prisma.$transaction(
      async (tx) => {
        const categories = await tx.category.findMany({
          select: CATEGORY_SELECT,
          orderBy: {
            createdAt: 'asc',
          },
        });

        const dishes = await tx.dish.findMany({
          select: DISH_SELECT,
          orderBy: {
            createdAt: 'asc',
          },
        });

        return { categories, dishes };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );

    return { categories, dishes };
  }
}
