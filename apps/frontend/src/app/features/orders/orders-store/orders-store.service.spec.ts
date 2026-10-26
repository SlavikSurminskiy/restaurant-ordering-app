import { TestBed } from '@angular/core/testing';
import type { PartialStateUpdater } from '@ngrx/signals';

import { OrderEventType, OrderStatus } from '@restaurant/shared-api-types';
import { OrderDomainModel } from '@restaurant/frontend/domain/orders';
import { LiveResourceUpdateKind } from '@restaurant/frontend/domain/sse';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

import { OrdersStoreState } from './orders-store.models';
import { OrdersStoreService } from './orders-store.service';

describe(OrdersStoreService.name, () => {
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

  describe('ordersStreamUpdater', () => {
    it('should show the orders of a snapshot', () => {
      const service = Arrange.setup();
      const order = Arrange.createOrder();

      const state = Arrange.apply(
        service.ordersStreamUpdater({
          kind: LiveResourceUpdateKind.Snapshot,
          snapshot: [order],
        }),
        Arrange.createState([], LoadStatus.Loading),
      );

      expect(state).toEqual(Arrange.createState([order], LoadStatus.Loaded));
    });

    it('should show a readable error while there are no orders', () => {
      const service = Arrange.setup();

      const state = Arrange.apply(
        service.ordersStreamUpdater({
          kind: LiveResourceUpdateKind.SnapshotFailed,
          error: new Error('Failed'),
        }),
        Arrange.createState([], LoadStatus.Loading),
      );

      expect(state.status).toBe(LoadStatus.Error);
      expect(state.error).toBe('Something went wrong. Please try again.');
    });

    it('should keep shown orders when a reload fails', () => {
      const service = Arrange.setup();
      const shown = Arrange.createState(
        [Arrange.createOrder()],
        LoadStatus.Loaded,
      );

      const state = Arrange.apply(
        service.ordersStreamUpdater({
          kind: LiveResourceUpdateKind.SnapshotFailed,
          error: new Error('Failed'),
        }),
        shown,
      );

      expect(state).toEqual(shown);
    });

    it('should take the order of an event', () => {
      const service = Arrange.setup();
      const ready = Arrange.createOrder({
        status: OrderStatus.Ready,
        updatedAt: '2026-10-25T10:00:20.000Z',
      });

      const state = Arrange.apply(
        service.ordersStreamUpdater({
          kind: LiveResourceUpdateKind.Event,
          event: { type: OrderEventType.Updated, order: ready },
        }),
        Arrange.createState([Arrange.createOrder()], LoadStatus.Loaded),
      );

      expect(state.orderEntityMap['o-1']).toEqual(ready);
    });
  });

  describe('orderUpdater', () => {
    it('should add an order it does not have yet', () => {
      const service = Arrange.setup();
      const order = Arrange.createOrder();

      const state = Arrange.apply(
        service.orderUpdater(order),
        Arrange.createState([], LoadStatus.Loaded),
      );

      expect(state.orderIds).toEqual(['o-1']);
    });

    it('should take a later state of an order', () => {
      const service = Arrange.setup();
      const later = Arrange.createOrder({
        updatedAt: '2026-10-25T10:00:20.000Z',
      });

      const state = Arrange.apply(
        service.orderUpdater(later),
        Arrange.createState([Arrange.createOrder()], LoadStatus.Loaded),
      );

      expect(state.orderEntityMap['o-1']).toEqual(later);
    });

    it('should not go back to an earlier state of an order', () => {
      const service = Arrange.setup();
      const later = Arrange.createOrder({
        updatedAt: '2026-10-25T10:00:20.000Z',
      });

      const state = Arrange.apply(
        service.orderUpdater(Arrange.createOrder()),
        Arrange.createState([later], LoadStatus.Loaded),
      );

      expect(state.orderEntityMap['o-1']).toEqual(later);
    });
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({ providers: [OrdersStoreService] });

    return TestBed.inject(OrdersStoreService);
  },

  apply(
    updater: PartialStateUpdater<OrdersStoreState>,
    state: OrdersStoreState,
  ): OrdersStoreState {
    return { ...state, ...updater(state) };
  },

  createState(
    orders: OrderDomainModel[],
    status: LoadStatus,
  ): OrdersStoreState {
    return {
      status,
      error: null,
      orderIds: orders.map(({ id }) => id),
      orderEntityMap: Object.fromEntries(
        orders.map((order) => [order.id, order]),
      ),
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
