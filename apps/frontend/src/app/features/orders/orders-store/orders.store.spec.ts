import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { OrderEventType, OrderStatus } from '@restaurant/shared-api-types';
import {
  OrderDomainModel,
  OrderStreamUpdate,
  OrdersDomainService,
} from '@restaurant/frontend/domain/orders';
import { ApiError } from '@restaurant/frontend/core/http';
import { LiveResourceUpdateKind } from '@restaurant/frontend/domain/sse';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

import { OrdersStoreService } from './orders-store.service';
import { OrdersStore } from './orders.store';

describe('OrdersStore', () => {
  it('should start streaming the orders once it is created', () => {
    const spies = Arrange.createSpies();

    Arrange.setup(spies);

    expect(spies.ordersDomainServiceMock.streamOrders).toHaveBeenCalledOnce();
  });

  it('should ask the domain for a fresh snapshot', () => {
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);

    store.reloadOrders();

    expect(spies.ordersDomainServiceMock.reloadOrders).toHaveBeenCalledOnce();
  });

  it('should be loading until the first snapshot', () => {
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);

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

    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.Snapshot,
      snapshot: [older, newer],
    });

    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.orders()).toEqual([newer, older]);
  });

  it('should show a readable error while there are no orders', () => {
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);

    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.SnapshotFailed,
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
    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.Snapshot,
      snapshot: [Arrange.createOrder()],
    });

    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.SnapshotFailed,
      error: new Error('Failed'),
    });

    expect(store.status()).toBe(LoadStatus.Loaded);
    expect(store.orders()).toEqual([Arrange.createOrder()]);
  });

  it('should add a new order from an event', () => {
    const order = Arrange.createOrder();
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);
    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.Snapshot,
      snapshot: [],
    });

    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.Event,
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
    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.Snapshot,
      snapshot: [Arrange.createOrder()],
    });

    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.Event,
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
    spies.ordersStream$.next({
      kind: LiveResourceUpdateKind.Snapshot,
      snapshot: [ready],
    });

    store.upsertOrder(Arrange.createOrder());

    expect(store.orders()).toEqual([ready]);
  });
});

interface Spies {
  ordersStream$: Subject<OrderStreamUpdate>;
  ordersDomainServiceMock: { streamOrders: Mock; reloadOrders: Mock };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        OrdersStore,
        OrdersStoreService,
        {
          provide: OrdersDomainService,
          useValue: spies.ordersDomainServiceMock,
        },
      ],
    });

    return TestBed.inject(OrdersStore);
  },

  createSpies(): Spies {
    const ordersStream$ = new Subject<OrderStreamUpdate>();

    return {
      ordersStream$,
      ordersDomainServiceMock: {
        streamOrders: vi.fn(() => ordersStream$.asObservable()),
        reloadOrders: vi.fn(),
      },
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
