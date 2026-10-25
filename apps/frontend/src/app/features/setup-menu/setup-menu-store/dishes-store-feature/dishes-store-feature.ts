import { patchState, signalStoreFeature, withMethods } from '@ngrx/signals';
import {
  removeEntity,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';

import { DishDomainModel } from '@restaurant/frontend/domain/menu-admin';

import { dishConfig } from './dishes-store-feature.constants';

export function withDishes() {
  return signalStoreFeature(
    withEntities(dishConfig),
    withMethods((store) => ({
      setDishes(dishes: DishDomainModel[]): void {
        patchState(store, setAllEntities(dishes, dishConfig));
      },
      upsertDish(dish: DishDomainModel): void {
        patchState(store, setEntity(dish, dishConfig));
      },
      removeDish(id: string): void {
        patchState(store, removeEntity(id, dishConfig));
      },
    })),
  );
}
