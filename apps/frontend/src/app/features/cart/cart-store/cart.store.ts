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
  removeEntity,
  updateEntity,
  withEntities,
  removeEntities,
  removeAllEntities,
} from '@ngrx/signals/entities';
import { withStorageSync } from '@ngrx-toolkit/core';

import { Money } from '@restaurant/shared-api-types';
import { OrderConflictDomainModel } from '@restaurant/frontend/domain/orders';

import { CART_STORAGE_KEY, cartItemConfig } from './cart-store.constants';
import { CartState, NewCartItem } from './cart-store.models';
import { CartStoreService } from './cart-store.service';

const initialState: CartState = {
  idempotencyKey: null,
};

/** Every change to the items drops the idempotency key: a changed cart is a new order. */
const NEW_ATTEMPT: Partial<CartState> = { idempotencyKey: null };

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities(cartItemConfig),
  withStorageSync(CART_STORAGE_KEY),
  withProps(() => ({
    _cartStoreService: inject(CartStoreService),
  })),
  withComputed(({ itemEntities }) => ({
    count: computed(() =>
      itemEntities().reduce((sum, { quantity }) => sum + quantity, 0),
    ),
  })),
  withMethods((store) => ({
    add(item: NewCartItem): void {
      const existing = store.itemEntityMap()[item.dishId];

      patchState(
        store,
        setEntity(
          store._cartStoreService.added(existing, item),
          cartItemConfig,
        ),
        NEW_ATTEMPT,
      );
    },
    setQuantity(dishId: string, quantity: number): void {
      patchState(
        store,
        quantity > 0
          ? updateEntity({ id: dishId, changes: { quantity } }, cartItemConfig)
          : removeEntity(dishId, cartItemConfig),
        NEW_ATTEMPT,
      );
    },
    setUnitPrice(dishId: string, unitPrice: Money): void {
      patchState(
        store,
        updateEntity({ id: dishId, changes: { unitPrice } }, cartItemConfig),
        NEW_ATTEMPT,
      );
    },
    remove(dishId: string): void {
      patchState(store, removeEntity(dishId, cartItemConfig), NEW_ATTEMPT);
    },
    applyConflicts(conflicts: readonly OrderConflictDomainModel[]): void {
      const { repriced, removedIds } =
        store._cartStoreService.resolved(conflicts);

      patchState(
        store,
        ...repriced.map((update) => updateEntity(update, cartItemConfig)),
        removeEntities(removedIds, cartItemConfig),
        NEW_ATTEMPT,
      );
    },
    setIdempotencyKey(idempotencyKey: string): void {
      patchState(store, { idempotencyKey });
    },
    clear(): void {
      patchState(store, removeAllEntities(cartItemConfig), NEW_ATTEMPT);
    },
  })),
);
