import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import {
  OrderEvent,
  ServerEvent,
  OrderStatus,
  MenuEventType,
  OrderEventType,
  OrderConflictReason,
} from '@restaurant/shared-api-types';
import { ApiError } from '@restaurant/frontend/core/http';
import { OrdersDataAccessService } from '@restaurant/frontend/data-access/orders';
import {
  LiveResourceOptions,
  LiveResourceFactoryService,
} from '@restaurant/frontend/domain/sse';
import { SseDataAccessService } from '@restaurant/frontend/data-access/sse';

import {
  OrderDomainModel,
  CreateOrderResultKind,
  CreateOrderDomainModel,
  OrderConflictDomainModel,
} from './orders-domain.models';
import { OrdersDomainService } from './orders-domain.service';

describe(OrdersDomainService.name, () => {
  describe('streamOrders', () => {
    it('should stream the orders snapshot', async () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);

      service.streamOrders().subscribe();
      const { loadSnapshot } = Arrange.lastOptions(spies);

      await expect(firstValueFrom(loadSnapshot())).resolves.toEqual([
        Arrange.createOrder(),
      ]);
    });

    it('should pick only order events', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const orderEvent: ServerEvent = {
        type: OrderEventType.Updated,
        order: Arrange.createOrder(),
      };
      const received: unknown[] = [];
      service.streamOrders().subscribe();
      Arrange.lastOptions(spies).events$.subscribe((event) =>
        received.push(event),
      );

      spies.serverEvents$.next({
        type: MenuEventType.DishDeleted,
        dishId: 'd-caesar',
      });
      spies.serverEvents$.next(orderEvent);

      expect(received).toEqual([orderEvent]);
    });

    it('should reload the snapshot on request', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const reloads = vi.fn();
      service.streamOrders().subscribe();
      Arrange.lastOptions(spies).reload$?.subscribe(reloads);

      service.reloadOrders();

      expect(reloads).toHaveBeenCalledOnce();
    });
  });

  it('should get the orders', async () => {
    const spies = Arrange.createSpies();
    const service = Arrange.setup(spies);

    await expect(firstValueFrom(service.getOrders())).resolves.toEqual([
      Arrange.createOrder(),
    ]);
  });

  it('should change the status of an order', async () => {
    const spies = Arrange.createSpies();
    const service = Arrange.setup(spies);

    await expect(
      firstValueFrom(service.updateOrderStatus('o-1', OrderStatus.Ready)),
    ).resolves.toEqual(Arrange.createOrder());
    expect(
      spies.ordersDataAccessServiceMock.updateOrderStatus,
    ).toHaveBeenCalledWith('o-1', { status: OrderStatus.Ready });
  });

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

type OrdersOptions = LiveResourceOptions<OrderDomainModel[], OrderEvent>;

interface Spies {
  ordersDataAccessServiceMock: {
    getOrders: Mock;
    updateOrderStatus: Mock;
    createOrder: Mock;
  };
  serverEvents$: Subject<ServerEvent>;
  sseDataAccessServiceMock: { serverEvents: Mock };
  liveResourceFactoryServiceMock: {
    create: Mock<(options: OrdersOptions) => Observable<unknown>>;
  };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrdersDataAccessService,
          useValue: spies.ordersDataAccessServiceMock,
        },
        {
          provide: SseDataAccessService,
          useValue: spies.sseDataAccessServiceMock,
        },
        {
          provide: LiveResourceFactoryService,
          useValue: spies.liveResourceFactoryServiceMock,
        },
      ],
    });

    return TestBed.inject(OrdersDomainService);
  },

  createSpies(): Spies {
    const serverEvents$ = new Subject<ServerEvent>();

    return {
      ordersDataAccessServiceMock: {
        getOrders: vi.fn().mockReturnValue(of([Arrange.createOrder()])),
        updateOrderStatus: vi.fn().mockReturnValue(of(Arrange.createOrder())),
        createOrder: vi.fn().mockReturnValue(of(Arrange.createOrder())),
      } satisfies Mocked<
        Pick<
          OrdersDataAccessService,
          'getOrders' | 'updateOrderStatus' | 'createOrder'
        >
      >,
      serverEvents$,
      sseDataAccessServiceMock: {
        serverEvents: vi.fn(() => serverEvents$.asObservable()),
      },
      liveResourceFactoryServiceMock: {
        create: vi.fn(() => new Subject<never>()),
      },
    };
  },

  /** The options the orders stream was created with. */
  lastOptions(spies: Spies): OrdersOptions {
    const options = spies.liveResourceFactoryServiceMock.create.mock.lastCall;

    if (!options) {
      throw new Error('The orders stream was not created');
    }

    return options[0];
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
