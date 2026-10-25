import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { OrderStatus, UserRole } from '@restaurant/shared-api-types';

import { RequestUser } from '../auth/auth.models';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe(OrdersController.name, () => {
  it('should be open to signed-in users only', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, OrdersController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('should let only admins change a status', () => {
    expect(
      new Reflector().get(Roles, OrdersController.prototype.updateStatus),
    ).toEqual([UserRole.Admin]);
  });

  it('should create an order with the idempotency key', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);
    const body = {
      items: [{ dishId: 'd-caesar', quantity: 1, unitPrice: 1250 }],
    };

    await controller.create(Arrange.createUser(), 'key-1', body);

    expect(spies.ordersServiceMock.create).toHaveBeenCalledWith(
      Arrange.createUser(),
      'key-1',
      body,
    );
  });

  it('should answer 400 without an idempotency key', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    expect(() =>
      controller.create(Arrange.createUser(), undefined, { items: [] }),
    ).toThrow(BadRequestException);
    expect(spies.ordersServiceMock.create).not.toHaveBeenCalled();
  });

  it('should list the orders of the user', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.list(Arrange.createUser());

    expect(spies.ordersServiceMock.list).toHaveBeenCalledWith(
      Arrange.createUser(),
    );
  });

  it('should change the status of an order', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);

    await controller.updateStatus('o-1', { status: OrderStatus.Ready });

    expect(spies.ordersServiceMock.updateStatus).toHaveBeenCalledWith(
      'o-1',
      OrderStatus.Ready,
    );
  });
});

interface Spies {
  ordersServiceMock: { create: Mock; list: Mock; updateStatus: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: spies.ordersServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    return moduleRef.get(OrdersController);
  },

  createSpies(): Spies {
    return {
      ordersServiceMock: {
        create: vi.fn().mockResolvedValue({}),
        list: vi.fn().mockResolvedValue([]),
        updateStatus: vi.fn().mockResolvedValue({}),
      },
    };
  },

  createUser(): RequestUser {
    return { id: 'u-customer', role: UserRole.Customer };
  },
};
