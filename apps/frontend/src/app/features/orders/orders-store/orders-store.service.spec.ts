import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';

import {
  OrderStatus,
  ServerEvent,
  MenuEventType,
  OrderEventType,
} from '@restaurant/shared-api-types';
import {
  OrderDomainModel,
  OrdersDomainService,
} from '@restaurant/frontend/domain/orders';
import {
  SseService,
  SnapshotSyncUpdateKind,
} from '@restaurant/frontend/core/realtime';

import { OrderUpdate } from './orders-store.models';
import { OrdersStoreService } from './orders-store.service';

describe(OrdersStoreService.name, () => {
  describe('orderUpdates', () => {
    it('should load the orders when the event stream opens', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const received: OrderUpdate[] = [];
      service.orderUpdates().subscribe((update) => received.push(update));

      spies.sseServiceMock.opened$.next();

      expect(received).toEqual([
        {
          kind: SnapshotSyncUpdateKind.Snapshot,
          snapshot: [Arrange.createOrder()],
        },
      ]);
    });

    it('should pass on order events and ignore menu events', () => {
      const orderEvent: ServerEvent = {
        type: OrderEventType.Updated,
        order: Arrange.createOrder({ status: OrderStatus.Ready }),
      };
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const received: OrderUpdate[] = [];
      service.orderUpdates().subscribe((update) => received.push(update));
      spies.sseServiceMock.opened$.next();

      spies.sseServiceMock.events$.next({
        type: MenuEventType.DishDeleted,
        dishId: 'd-caesar',
      });
      spies.sseServiceMock.events$.next(orderEvent);

      expect(received).toEqual([
        {
          kind: SnapshotSyncUpdateKind.Snapshot,
          snapshot: [Arrange.createOrder()],
        },
        { kind: SnapshotSyncUpdateKind.Event, event: orderEvent },
      ]);
    });
  });

  it('should sort the orders newest first', () => {
    const service = Arrange.setup();
    const older = Arrange.createOrder({
      id: 'o-1',
      createdAt: '2026-10-25T10:00:00.000Z',
    });
    const newer = Arrange.createOrder({
      id: 'o-2',
      createdAt: '2026-10-25T11:00:00.000Z',
    });

    expect(service.sortNewestFirst([older, newer])).toEqual([newer, older]);
  });

  describe('isNewer', () => {
    it('should take an order it does not have yet', () => {
      const service = Arrange.setup();

      expect(service.isNewer(Arrange.createOrder(), undefined)).toBe(true);
    });

    it('should take a later state of an order', () => {
      const service = Arrange.setup();

      expect(
        service.isNewer(
          Arrange.createOrder({ updatedAt: '2026-10-25T10:00:20.000Z' }),
          Arrange.createOrder(),
        ),
      ).toBe(true);
    });

    it('should not take an earlier state of an order', () => {
      const service = Arrange.setup();

      expect(
        service.isNewer(
          Arrange.createOrder(),
          Arrange.createOrder({ updatedAt: '2026-10-25T10:00:20.000Z' }),
        ),
      ).toBe(false);
    });
  });
});

interface Spies {
  ordersDomainServiceMock: { getOrders: Mock };
  sseServiceMock: {
    opened$: Subject<void>;
    events$: Subject<ServerEvent>;
  };
}

const Arrange = {
  setup(spies: Spies = Arrange.createSpies()) {
    TestBed.configureTestingModule({
      providers: [
        OrdersStoreService,
        {
          provide: OrdersDomainService,
          useValue: spies.ordersDomainServiceMock,
        },
        { provide: SseService, useValue: spies.sseServiceMock },
      ],
    });

    return TestBed.inject(OrdersStoreService);
  },

  createSpies(): Spies {
    return {
      ordersDomainServiceMock: {
        getOrders: vi.fn().mockReturnValue(of([Arrange.createOrder()])),
      } satisfies Mocked<Pick<OrdersDomainService, 'getOrders'>>,
      sseServiceMock: {
        opened$: new Subject<void>(),
        events$: new Subject<ServerEvent>(),
      } satisfies Pick<SseService, 'opened$' | 'events$'>,
    };
  },

  createOrder(order: Partial<OrderDomainModel> = {}): OrderDomainModel {
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
      ...order,
    };
  },
};
