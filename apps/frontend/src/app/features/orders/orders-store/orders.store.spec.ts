import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { OrderEventType, OrderStatus } from '@restaurant/shared-api-types';
import {
  OrderDomainModel,
  OrdersDomainService,
} from '@restaurant/frontend/domain/orders';
import { ApiError } from '@restaurant/frontend/core/http';
import {
  SseService,
  SnapshotSyncUpdateKind,
} from '@restaurant/frontend/core/realtime';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

import { OrderUpdate } from './orders-store.models';
import { OrdersStoreService } from './orders-store.service';
import { OrdersStore } from './orders.store';

describe('OrdersStore', () => {
  it('should be loading until the first snapshot', () => {
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);

    store.keepOrdersUpToDate();

    expect(store.status()).toBe(LoadStatus.Loading);
    expect(store.orders()).toEqual([]);
  });

  it('should show the orders of a snapshot, newest first', () => {
    const older = Arrange.createOrder();
    const newer = Arrange.createOrder({
      id: 'o-2',
      createdAt: '2026-10-25T11:00:00.000Z',
    });
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);

    store.keepOrdersUpToDate();
    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.Snapshot,
      snapshot: [older, newer],
    });

    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.orders()).toEqual([newer, older]);
  });

  it('should show a readable error while there are no orders', () => {
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);

    store.keepOrdersUpToDate();
    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.SnapshotFailed,
      error: new ApiError(
        HttpStatusCode.ServiceUnavailable,
        'The server is having trouble.',
      ),
    });

    expect(store.status()).toBe(LoadStatus.Error);
    expect(store.error()).toBe('The server is having trouble.');
  });

  it('should keep shown orders when a reload fails', () => {
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);
    store.keepOrdersUpToDate();
    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.Snapshot,
      snapshot: [Arrange.createOrder()],
    });

    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.SnapshotFailed,
      error: new Error('Failed'),
    });

    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.orders()).toEqual([Arrange.createOrder()]);
  });

  it('should add a new order from an event', () => {
    const order = Arrange.createOrder();
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);
    store.keepOrdersUpToDate();
    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.Snapshot,
      snapshot: [],
    });

    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.Event,
      event: { type: OrderEventType.Created, order },
    });

    expect(store.orders()).toEqual([order]);
  });

  it('should take a later status from an event', () => {
    const ready = Arrange.createOrder({
      status: OrderStatus.Ready,
      updatedAt: '2026-10-25T10:00:20.000Z',
    });
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);
    store.keepOrdersUpToDate();
    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.Snapshot,
      snapshot: [Arrange.createOrder()],
    });

    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.Event,
      event: { type: OrderEventType.Updated, order: ready },
    });

    expect(store.orders()).toEqual([ready]);
  });

  it('should not go back to an earlier state of an order', () => {
    const ready = Arrange.createOrder({
      status: OrderStatus.Ready,
      updatedAt: '2026-10-25T10:00:20.000Z',
    });
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);
    store.keepOrdersUpToDate();
    spies.orderUpdates$.next({
      kind: SnapshotSyncUpdateKind.Snapshot,
      snapshot: [ready],
    });

    store.upsertOrder(Arrange.createOrder());

    expect(store.orders()).toEqual([ready]);
  });
});

interface Spies {
  orderUpdates$: Subject<OrderUpdate>;
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        OrdersStore,
        OrdersStoreService,
        { provide: OrdersDomainService, useValue: {} },
        { provide: SseService, useValue: {} },
      ],
    });

    vi.spyOn(
      TestBed.inject(OrdersStoreService),
      'orderUpdates',
    ).mockReturnValue(spies.orderUpdates$);

    return TestBed.inject(OrdersStore);
  },

  createSpies(): Spies {
    return { orderUpdates$: new Subject<OrderUpdate>() };
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
