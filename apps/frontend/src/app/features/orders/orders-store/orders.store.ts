import { computed, inject } from '@angular/core';
import {
  withHooks,
  withState,
  withProps,
  patchState,
  signalStore,
  withMethods,
  withComputed,
} from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tap } from 'rxjs';

import {
  OrderDomainModel,
  OrderStreamUpdate,
  OrdersDomainService,
} from '@restaurant/frontend/domain/orders';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

import { orderConfig } from './orders-store.constants';
import { OrdersState } from './orders-store.models';
import { OrdersStoreService } from './orders-store.service';

const initialState: OrdersState = {
  status: LoadStatus.Loading,
  error: null,
};

export const OrdersStore = signalStore(
  withState(initialState),
  withEntities(orderConfig),
  withProps(() => ({
    _ordersStoreService: inject(OrdersStoreService),
    _ordersDomainService: inject(OrdersDomainService),
  })),
  withComputed(({ orderEntities, _ordersStoreService }) => ({
    orders: computed(() =>
      _ordersStoreService.sortNewestFirst(orderEntities()),
    ),
  })),
  withMethods((store) => ({
    upsertOrder(order: OrderDomainModel): void {
      patchState(store, store._ordersStoreService.orderUpdater(order));
    },
    processOrdersStream: rxMethod<OrderStreamUpdate>(
      tap((update) =>
        patchState(
          store,
          store._ordersStoreService.ordersStreamUpdater(update),
        ),
      ),
    ),
    reloadOrders(): void {
      store._ordersDomainService.reloadOrders();
    },
  })),
  withHooks({
    onInit(store) {
      store.processOrdersStream(store._ordersDomainService.streamOrders());
    },
  }),
);
