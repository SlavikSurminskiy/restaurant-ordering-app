import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { EventPublisher } from '@restaurant/backend-events';
import {
  isPrismaError,
  PrismaErrorCode,
  PrismaService,
} from '@restaurant/database';
import {
  Category,
  MenuEventType,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@restaurant/shared-api-types';

import { CATEGORY_SELECT } from '../menu.constants';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
  ) {}

  async create(request: CreateCategoryRequest): Promise<Category> {
    const category = await this.prisma.category.create({
      data: request,
      select: CATEGORY_SELECT,
    });

    await this.events.publish({
      type: MenuEventType.CategoryUpserted,
      category,
    });

    return category;
  }

  async update(id: string, patch: UpdateCategoryRequest): Promise<Category> {
    let category: Category;

    try {
      category = await this.prisma.category.update({
        where: { id },
        data: patch,
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        throw new NotFoundException('Category not found.');
      }

      throw error;
    }

    await this.events.publish({
      type: MenuEventType.CategoryUpserted,
      category,
    });

    return category;
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        throw new NotFoundException('Category not found.');
      }

      if (isPrismaError(error, PrismaErrorCode.ForeignKeyViolation)) {
        throw new ConflictException(
          'The category has dishes. Delete or move them first.',
        );
      }

      throw error;
    }

    await this.events.publish({
      type: MenuEventType.CategoryDeleted,
      categoryId: id,
    });
  }
}
