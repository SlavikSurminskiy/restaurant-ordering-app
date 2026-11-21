import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { EventPublisher } from '@restaurant/backend-events';
import { Prisma, PrismaErrorCode, PrismaService } from '@restaurant/database';
import { Category, MenuEventType } from '@restaurant/shared-api-types';

import { CATEGORY_SELECT } from '../menu.constants';

import { CategoriesService } from './categories.service';

describe(CategoriesService.name, () => {
  describe('create', () => {
    it('should create the category and return it', async () => {
      const category = Arrange.createCategory();
      const spies = Arrange.createSpies();
      spies.prismaMock.category.create.mockResolvedValue(category);
      const service = await Arrange.setup(spies);

      await expect(service.create({ name: category.name })).resolves.toEqual(
        category,
      );
      expect(spies.prismaMock.category.create).toHaveBeenCalledWith({
        data: { name: category.name },
        select: CATEGORY_SELECT,
      });
    });

    it('should publish the created category', async () => {
      const category = Arrange.createCategory();
      const spies = Arrange.createSpies();
      spies.prismaMock.category.create.mockResolvedValue(category);
      const service = await Arrange.setup(spies);

      await service.create({ name: category.name });

      expect(spies.eventPublisherMock.publish).toHaveBeenCalledWith({
        type: MenuEventType.CategoryUpserted,
        category,
      });
    });
  });

  describe('update', () => {
    it('should update the category and return it', async () => {
      const category = Arrange.createCategory();
      const spies = Arrange.createSpies();
      spies.prismaMock.category.update.mockResolvedValue(category);
      const service = await Arrange.setup(spies);

      await expect(
        service.update(category.id, { name: category.name }),
      ).resolves.toEqual(category);
      expect(spies.prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: category.id },
        data: { name: category.name },
        select: CATEGORY_SELECT,
      });
    });

    it('should publish the updated category', async () => {
      const category = Arrange.createCategory();
      const spies = Arrange.createSpies();
      spies.prismaMock.category.update.mockResolvedValue(category);
      const service = await Arrange.setup(spies);

      await service.update(category.id, { name: category.name });

      expect(spies.eventPublisherMock.publish).toHaveBeenCalledWith({
        type: MenuEventType.CategoryUpserted,
        category,
      });
    });

    it('should answer 404 for an unknown category and publish nothing', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.category.update.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.RecordNotFound),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.update(Arrange.createCategory().id, { name: 'Salads' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete the category', async () => {
      const { id } = Arrange.createCategory();
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.delete(id);

      expect(spies.prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should publish the id of the deleted category', async () => {
      const { id } = Arrange.createCategory();
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.delete(id);

      expect(spies.eventPublisherMock.publish).toHaveBeenCalledWith({
        type: MenuEventType.CategoryDeleted,
        categoryId: id,
      });
    });

    it('should answer 404 for an unknown category and publish nothing', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.category.delete.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.RecordNotFound),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.delete(Arrange.createCategory().id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });

    it('should answer 409 while the category has dishes and publish nothing', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.category.delete.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.ForeignKeyViolation),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.delete(Arrange.createCategory().id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });

    it('should pass other errors through', async () => {
      const error = new Error('Connection lost');
      const spies = Arrange.createSpies();
      spies.prismaMock.category.delete.mockRejectedValue(error);
      const service = await Arrange.setup(spies);

      await expect(service.delete(Arrange.createCategory().id)).rejects.toBe(
        error,
      );
    });
  });
});

interface Spies {
  prismaMock: {
    category: { create: Mock; update: Mock; delete: Mock };
  };
  eventPublisherMock: { publish: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: spies.prismaMock },
        { provide: EventPublisher, useValue: spies.eventPublisherMock },
      ],
    }).compile();

    return moduleRef.get(CategoriesService);
  },

  createSpies(): Spies {
    return {
      prismaMock: {
        category: {
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn().mockResolvedValue({}),
        },
      },
      eventPublisherMock: { publish: vi.fn().mockResolvedValue(undefined) },
    };
  },

  createCategory(): Category {
    return { id: '0b9c6a3e-4f4f-4d8e-9a57-5f3a3c1f2b10', name: 'Soups' };
  },

  createPrismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError('Failed', {
      code,
      clientVersion: 'test',
    });
  },
};
