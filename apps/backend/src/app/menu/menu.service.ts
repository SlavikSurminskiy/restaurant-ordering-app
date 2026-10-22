import { Injectable } from '@nestjs/common';

import { PrismaService, Prisma } from '@restaurant/database';
import { MenuResponse } from '@restaurant/shared-api-types';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(): Promise<MenuResponse> {
    const { categories, dishes } = await this.prisma.$transaction(
      async (tx) => {
        const categories = await tx.category.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        const dishes = await tx.dish.findMany({
          select: {
            id: true,
            categoryId: true,
            name: true,
            description: true,
            photoUrl: true,
            price: true,
            isOpenPrice: true,
            available: true,
          },
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
