import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import { OrderStatus, OrderConflictReason } from '@restaurant/shared-api-types';
import { ApiError } from '@restaurant/frontend/core/http';
import { OrdersDataAccessService } from '@restaurant/frontend/data-access/orders';

import {
  OrderDomainModel,
  CreateOrderResultKind,
  CreateOrderDomainModel,
  OrderConflictDomainModel,
} from './orders-domain.models';
import { OrdersDomainService } from './orders-domain.service';

describe(OrdersDomainService.name, () => {
  it('should create the order with the idempotency key', async () => {
    const spies = Arrange.createSpies();
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(service.createOrder(Arrange.createRequest(), 'key-1')),
    ).resolves.toEqual({
      kind: CreateOrderResultKind.Created,
      order: Arrange.createOrder(),
    });
    expect(spies.ordersDataAccessServiceMock.createOrder).toHaveBeenCalledWith(
      Arrange.createRequest(),
      'key-1',
    );
  });

  it('should turn a 409 into the conflicts', async () => {
    const spies = Arrange.createSpies();
    spies.ordersDataAccessServiceMock.createOrder.mockReturnValue(
      throwError(
        () =>
          new ApiError(HttpStatusCode.Conflict, 'Conflict', {
            conflicts: [Arrange.createConflict()],
          }),
      ),
    );
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(service.createOrder(Arrange.createRequest(), 'key-1')),
    ).resolves.toEqual({
      kind: CreateOrderResultKind.Conflicts,
      conflicts: [Arrange.createConflict()],
    });
  });

  it('should pass other errors on', async () => {
    const error = new ApiError(HttpStatusCode.InternalServerError, 'Failed');
    const spies = Arrange.createSpies();
    spies.ordersDataAccessServiceMock.createOrder.mockReturnValue(
      throwError(() => error),
    );
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(service.createOrder(Arrange.createRequest(), 'key-1')),
    ).rejects.toBe(error);
  });

  it('should pass on a 409 without conflicts', async () => {
    const error = new ApiError(HttpStatusCode.Conflict, 'Conflict');
    const spies = Arrange.createSpies();
    spies.ordersDataAccessServiceMock.createOrder.mockReturnValue(
      throwError(() => error),
    );
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(service.createOrder(Arrange.createRequest(), 'key-1')),
    ).rejects.toBe(error);
  });
});

interface Spies {
  ordersDataAccessServiceMock: { createOrder: Mock };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrdersDataAccessService,
          useValue: spies.ordersDataAccessServiceMock,
        },
      ],
    });

    return TestBed.inject(OrdersDomainService);
  },

  createSpies(): Spies {
    return {
      ordersDataAccessServiceMock: {
        createOrder: vi.fn().mockReturnValue(of(Arrange.createOrder())),
      } satisfies Mocked<Pick<OrdersDataAccessService, 'createOrder'>>,
    };
  },

  createRequest(): CreateOrderDomainModel {
    return { items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }] };
  },

  createConflict(): OrderConflictDomainModel {
    return {
      dishId: 'd-caesar',
      reason: OrderConflictReason.PriceChanged,
      currentPrice: 1490,
    };
  },

  createOrder(): OrderDomainModel {
    return {
      id: 'o-1',
      userId: 'u-customer',
      userName: 'Customer',
      status: OrderStatus.New,
      items: [],
      subtotal: 2500,
      discount: 500,
      total: 2000,
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    };
  },
};
