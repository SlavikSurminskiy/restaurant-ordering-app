import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { RequestUser } from '@restaurant/backend-auth';
import { EventPublisher } from '@restaurant/backend-events';
import { Prisma, PrismaErrorCode, PrismaService } from '@restaurant/database';
import {
  OrderConflictReason,
  OrderEventType,
  OrderPricingResponse,
  OrderStatus,
  PricedDish,
  UserRole,
} from '@restaurant/shared-api-types';

import { MenuClient } from './menu-client/menu-client.service';
import { ORDER_INCLUDE, OrderRecord } from './orders.constants';
import { toOrder } from './orders.mapper';
import { OrdersService } from './orders.service';
import { OrderConflictsService } from './order-conflicts/order-conflicts.service';
import { OrderStatusService } from './order-status/order-status.service';

describe(OrdersService.name, () => {
  describe('create', () => {
    it('should create the order with copied names and prices and the totals', async () => {
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.create(Arrange.createCustomer(), 'key-1', {
        items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }],
      });

      expect(spies.prismaMock.order.create).toHaveBeenCalledWith({
        data: {
          userId: 'u-customer',
          idempotencyKey: 'key-1',
          subtotal: 2500,
          discount: 500,
          total: 2000,
          items: {
            create: [
              {
                dishId: 'd-caesar',
                name: 'Chicken Caesar',
                unitPrice: 1250,
                quantity: 2,
              },
            ],
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    it('should ask the menu about the ordered dishes', async () => {
      const spies = Arrange.createSpies();
      spies.menuClientMock.getPricing.mockResolvedValue(
        Arrange.createPricing([
          Arrange.createDish(),
          { ...Arrange.createDish(), id: 'd-soup', price: 800 },
        ]),
      );
      const service = await Arrange.setup(spies);

      await service.create(Arrange.createCustomer(), 'key-1', {
        items: [
          { dishId: 'd-caesar', quantity: 2, unitPrice: 1250 },
          { dishId: 'd-soup', quantity: 1, unitPrice: 800 },
        ],
      });

      expect(spies.menuClientMock.getPricing).toHaveBeenCalledWith({
        dishIds: ['d-caesar', 'd-soup'],
      });
    });

    it('should return the created order and publish it', async () => {
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      const order = await service.create(Arrange.createCustomer(), 'key-1', {
        items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }],
      });

      expect(order).toEqual(toOrder(Arrange.createRecord()));
      expect(spies.eventPublisherMock.publish).toHaveBeenCalledWith({
        type: OrderEventType.Created,
        order,
      });
    });

    it('should return the order a repeated key created, without ordering again', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findUnique.mockResolvedValue(
        Arrange.createRecord(),
      );
      const service = await Arrange.setup(spies);

      const order = await service.create(Arrange.createCustomer(), 'key-1', {
        items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }],
      });

      expect(order).toEqual(toOrder(Arrange.createRecord()));
      expect(spies.menuClientMock.getPricing).not.toHaveBeenCalled();
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });

    it('should answer 409 with the conflicts and order nothing', async () => {
      const spies = Arrange.createSpies();
      spies.menuClientMock.getPricing.mockResolvedValue(
        Arrange.createPricing([{ ...Arrange.createDish(), price: 1490 }]),
      );
      const service = await Arrange.setup(spies);

      const error = await service
        .create(Arrange.createCustomer(), 'key-1', {
          items: [{ dishId: 'd-caesar', quantity: 1, unitPrice: 1250 }],
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        conflicts: [
          {
            dishId: 'd-caesar',
            reason: OrderConflictReason.PriceChanged,
            currentPrice: 1490,
          },
        ],
      });
      expect(spies.prismaMock.order.create).not.toHaveBeenCalled();
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });

    it('should order nothing when the menu is unavailable', async () => {
      const spies = Arrange.createSpies();
      spies.menuClientMock.getPricing.mockRejectedValue(
        new ServiceUnavailableException(),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.create(Arrange.createCustomer(), 'key-1', {
          items: [{ dishId: 'd-caesar', quantity: 1, unitPrice: 1250 }],
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(spies.prismaMock.order.create).not.toHaveBeenCalled();
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });

    it('should return the order of a request that raced with the same key', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(Arrange.createRecord());
      spies.prismaMock.order.create.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.UniqueConstraintViolation),
      );
      const service = await Arrange.setup(spies);

      const order = await service.create(Arrange.createCustomer(), 'key-1', {
        items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }],
      });

      expect(order).toEqual(toOrder(Arrange.createRecord()));
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list only the orders of a customer', async () => {
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.list(Arrange.createCustomer());

      expect(spies.prismaMock.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-customer' },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should list every order for an admin', async () => {
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.list({
        id: 'u-admin',
        role: UserRole.Admin,
        name: 'Admin',
      });

      expect(spies.prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should change the status and publish the order', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findUnique.mockResolvedValue({
        status: OrderStatus.New,
      });
      const service = await Arrange.setup(spies);

      const order = await service.updateStatus('o-1', OrderStatus.Ready);

      expect(spies.prismaMock.order.update).toHaveBeenCalledWith({
        where: { id: 'o-1', status: OrderStatus.New },
        data: { status: OrderStatus.Ready },
        include: ORDER_INCLUDE,
      });
      expect(spies.eventPublisherMock.publish).toHaveBeenCalledWith({
        type: OrderEventType.Updated,
        order,
      });
    });

    it('should answer 404 for an unknown order', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findUnique.mockResolvedValue(null);
      const service = await Arrange.setup(spies);

      await expect(
        service.updateStatus('o-1', OrderStatus.Ready),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should answer 409 for a move back', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findUnique.mockResolvedValue({
        status: OrderStatus.Ready,
      });
      const service = await Arrange.setup(spies);

      await expect(
        service.updateStatus('o-1', OrderStatus.New),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(spies.prismaMock.order.update).not.toHaveBeenCalled();
    });

    it('should answer 409 when the status changed meanwhile', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findUnique.mockResolvedValue({
        status: OrderStatus.New,
      });
      spies.prismaMock.order.update.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.RecordNotFound),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.updateStatus('o-1', OrderStatus.Ready),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });
  });

  describe('advanceStatuses', () => {
    it('should move orders that waited a full step one status on', async () => {
      const now = new Date('2026-10-25T10:00:20.000Z');
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findMany.mockResolvedValue([
        { id: 'o-1', status: OrderStatus.New },
        { id: 'o-2', status: OrderStatus.Ready },
      ]);
      const service = await Arrange.setup(spies);

      await expect(service.advanceStatuses(now, 20_000)).resolves.toBe(2);

      expect(spies.prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: [OrderStatus.New, OrderStatus.Preparing, OrderStatus.Ready],
            },
            updatedAt: { lte: new Date('2026-10-25T10:00:00.000Z') },
          },
        }),
      );
      expect(spies.prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o-1', status: OrderStatus.New },
          data: { status: OrderStatus.Preparing },
        }),
      );
      expect(spies.prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o-2', status: OrderStatus.Ready },
          data: { status: OrderStatus.Completed },
        }),
      );
      expect(spies.eventPublisherMock.publish).toHaveBeenCalledTimes(2);
    });

    it('should skip an order an admin moved meanwhile', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.order.findMany.mockResolvedValue([
        { id: 'o-1', status: OrderStatus.New },
      ]);
      spies.prismaMock.order.update.mockRejectedValue(
        Arrange.createPrismaError(PrismaErrorCode.RecordNotFound),
      );
      const service = await Arrange.setup(spies);

      await expect(service.advanceStatuses(new Date(), 20_000)).resolves.toBe(
        0,
      );
      expect(spies.eventPublisherMock.publish).not.toHaveBeenCalled();
    });
  });
});

interface Spies {
  prismaMock: {
    order: { create: Mock; findUnique: Mock; findMany: Mock; update: Mock };
  };
  eventPublisherMock: { publish: Mock };
  menuClientMock: { getPricing: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: spies.prismaMock },
        { provide: EventPublisher, useValue: spies.eventPublisherMock },
        { provide: MenuClient, useValue: spies.menuClientMock },
        OrderStatusService,
        OrderConflictsService,
      ],
    }).compile();

    return moduleRef.get(OrdersService);
  },

  createSpies(): Spies {
    return {
      prismaMock: {
        order: {
          create: vi.fn().mockResolvedValue(Arrange.createRecord()),
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn().mockResolvedValue(Arrange.createRecord()),
        },
      },
      eventPublisherMock: { publish: vi.fn().mockResolvedValue(undefined) },
      menuClientMock: {
        getPricing: vi
          .fn()
          .mockResolvedValue(Arrange.createPricing([Arrange.createDish()])),
      },
    };
  },

  createPricing(dishes: PricedDish[]): OrderPricingResponse {
    return { dishes, discount: 500 };
  },

  createCustomer(): RequestUser {
    return { id: 'u-customer', role: UserRole.Customer, name: 'Customer' };
  },

  createDish(): PricedDish {
    return {
      id: 'd-caesar',
      name: 'Chicken Caesar',
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },

  createRecord(): OrderRecord {
    return {
      id: 'o-1',
      userId: 'u-customer',
      idempotencyKey: 'key-1',
      status: OrderStatus.New,
      subtotal: 2500,
      discount: 500,
      total: 2000,
      createdAt: new Date('2026-10-25T10:00:00.000Z'),
      updatedAt: new Date('2026-10-25T10:00:00.000Z'),
      user: { name: 'Customer' },
      items: [
        {
          id: 'i-1',
          dishId: 'd-caesar',
          name: 'Chicken Caesar',
          unitPrice: 1250,
          quantity: 2,
        },
      ],
    };
  },

  createPrismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError('Failed', {
      code,
      clientVersion: 'test',
    });
  },
};
