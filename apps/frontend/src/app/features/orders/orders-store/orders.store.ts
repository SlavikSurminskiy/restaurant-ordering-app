import { computed, inject } from '@angular/core';
import {
  withState,
  withProps,
  patchState,
  signalStore,
  withMethods,
  withComputed,
} from '@ngrx/signals';
import {
  setEntity,
  withEntities,
  setAllEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { OrderDomainModel } from '@restaurant/frontend/domain/orders';
import { errorMessage } from '@restaurant/frontend/core/http';
import { SnapshotSyncUpdateKind } from '@restaurant/frontend/core/realtime';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

import { orderConfig } from './orders-store.constants';
import { OrdersState, OrderUpdate } from './orders-store.models';
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
  })),
  withComputed(({ orderEntities, _ordersStoreService }) => ({
    orders: computed(() =>
      _ordersStoreService.sortNewestFirst(orderEntities()),
    ),
  })),
  withMethods((store) => ({
    upsertOrder(order: OrderDomainModel): void {
      const current = store.orderEntityMap()[order.id];

      if (store._ordersStoreService.isNewer(order, current)) {
        patchState(store, setEntity(order, orderConfig));
      }
    },
  })),
  withMethods((store) => ({
    _applyUpdate(update: OrderUpdate): void {
      switch (update.kind) {
        case SnapshotSyncUpdateKind.Snapshot:
          patchState(store, setAllEntities(update.snapshot, orderConfig), {
            status: LoadStatus.Loaded,
            error: null,
          });
          break;
        case SnapshotSyncUpdateKind.SnapshotFailed:
          // Shown orders stay on screen while the reload is retried.
          if (store.status() !== LoadStatus.Loaded) {
            patchState(store, {
              status: LoadStatus.Error,
              error: errorMessage(update.error),
            });
          }
          break;
        case SnapshotSyncUpdateKind.Event:
          // Both events carry the full order.
          store.upsertOrder(update.event.order);
          break;
      }
    },
  })),
  withMethods((store) => ({
    keepOrdersUpToDate: rxMethod<void>(
      pipe(
        switchMap(() => store._ordersStoreService.orderUpdates()),
        tap((update) => store._applyUpdate(update)),
      ),
    ),
  })),
);
