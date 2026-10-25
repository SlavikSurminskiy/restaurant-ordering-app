import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { Prisma, PrismaErrorCode, PrismaService } from '@restaurant/database';
import { Dish, MenuEventType } from '@restaurant/shared-api-types';

import { EventBus } from '../../events/event-bus/event-bus';
import { DISH_SELECT } from '../menu.constants';

import { DishesService } from './dishes.service';

describe(DishesService.name, () => {
  describe('create', () => {
    it('should create the dish and return it', async () => {
      const { id, ...request } = Arrange.createDish();
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.create.mockResolvedValue({ id, ...request });
      const service = await Arrange.setup(spies);

      await expect(service.create(request)).resolves.toEqual({
        id,
        ...request,
      });
      expect(spies.prismaMock.dish.create).toHaveBeenCalledWith({
        data: request,
        select: DISH_SELECT,
      });
    });

    it('should publish the created dish', async () => {
      const { id, ...request } = Arrange.createDish();
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.create.mockResolvedValue({ id, ...request });
      const service = await Arrange.setup(spies);

      await service.create(request);

      expect(spies.eventBusMock.publish).toHaveBeenCalledWith({
        type: MenuEventType.DishUpserted,
        dish: { id, ...request },
      });
    });
  });

  describe('update', () => {
    it('should update the dish and return it', async () => {
      const dish = Arrange.createDish({ available: false });
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.update.mockResolvedValue(dish);
      const service = await Arrange.setup(spies);

      await expect(
        service.update(dish.id, { available: false }),
      ).resolves.toEqual(dish);
      expect(spies.prismaMock.dish.update).toHaveBeenCalledWith({
        where: { id: dish.id },
        data: { available: false },
        select: DISH_SELECT,
      });
    });

    it('should publish the updated dish', async () => {
      const dish = Arrange.createDish({ available: false });
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.update.mockResolvedValue(dish);
      const service = await Arrange.setup(spies);

      await service.update(dish.id, { available: false });

      expect(spies.eventBusMock.publish).toHaveBeenCalledWith({
        type: MenuEventType.DishUpserted,
        dish,
      });
    });

    it('should answer 404 for an unknown dish', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.findUnique.mockResolvedValue(null);
      const service = await Arrange.setup(spies);

      await expect(
        service.update(Arrange.createDish().id, { available: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(spies.prismaMock.dish.update).not.toHaveBeenCalled();
    });

    it('should answer 404 when the dish is deleted meanwhile and publish nothing', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.update.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.RecordNotFound),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.update(Arrange.createDish().id, { available: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(spies.eventBusMock.publish).not.toHaveBeenCalled();
    });

    it.each([[{ isOpenPrice: true }], [{ price: null }]])(
      'should reject %j that breaks the price rule of the stored dish',
      async (patch) => {
        const spies = Arrange.createSpies();
        const service = await Arrange.setup(spies);

        await expect(
          service.update(Arrange.createDish().id, patch),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(spies.prismaMock.dish.update).not.toHaveBeenCalled();
      },
    );

    it('should turn a dish into an open-price one when the price is removed', async () => {
      const dish = Arrange.createDish({ price: null, isOpenPrice: true });
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.update.mockResolvedValue(dish);
      const service = await Arrange.setup(spies);

      await expect(
        service.update(dish.id, { price: null, isOpenPrice: true }),
      ).resolves.toEqual(dish);
    });
  });

  describe('delete', () => {
    it('should delete the dish', async () => {
      const { id } = Arrange.createDish();
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.delete(id);

      expect(spies.prismaMock.dish.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should publish the id of the deleted dish', async () => {
      const { id } = Arrange.createDish();
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.delete(id);

      expect(spies.eventBusMock.publish).toHaveBeenCalledWith({
        type: MenuEventType.DishDeleted,
        dishId: id,
      });
    });

    it('should answer 404 for an unknown dish and publish nothing', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.delete.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.RecordNotFound),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.delete(Arrange.createDish().id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(spies.eventBusMock.publish).not.toHaveBeenCalled();
    });

    it('should pass other errors through', async () => {
      const error = new Error('Connection lost');
      const spies = Arrange.createSpies();
      spies.prismaMock.dish.delete.mockRejectedValue(error);
      const service = await Arrange.setup(spies);

      await expect(service.delete(Arrange.createDish().id)).rejects.toBe(error);
    });
  });
});

interface Spies {
  prismaMock: {
    dish: { create: Mock; findUnique: Mock; update: Mock; delete: Mock };
  };
  eventBusMock: { publish: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DishesService,
        { provide: PrismaService, useValue: spies.prismaMock },
        { provide: EventBus, useValue: spies.eventBusMock },
      ],
    }).compile();

    return moduleRef.get(DishesService);
  },

  createSpies(): Spies {
    const { price, isOpenPrice } = Arrange.createDish();

    return {
      prismaMock: {
        dish: {
          create: vi.fn(),
          findUnique: vi.fn().mockResolvedValue({ price, isOpenPrice }),
          update: vi.fn(),
          delete: vi.fn().mockResolvedValue({}),
        },
      },
      eventBusMock: { publish: vi.fn() },
    };
  },

  createDish(change: Partial<Dish> = {}): Dish {
    return {
      id: '7d2f1c84-1e7b-4a59-8c39-2b6e9f0d4a21',
      categoryId: '0b9c6a3e-4f4f-4d8e-9a57-5f3a3c1f2b10',
      name: 'Borscht',
      description: '',
      photoUrl: null,
      price: 13500,
      isOpenPrice: false,
      available: true,
      ...change,
    };
  },

  createPrismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError('Failed', {
      code,
      clientVersion: 'test',
    });
  },
};
