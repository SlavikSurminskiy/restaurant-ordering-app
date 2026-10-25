import { patchState, signalStoreFeature, withMethods } from '@ngrx/signals';
import {
  setEntity,
  withEntities,
  removeEntity,
  setAllEntities,
} from '@ngrx/signals/entities';

import { CategoryDomainModel } from '../../../../shared/domain/menu-admin/menu-admin-domain.models';

import { categoryConfig } from './categories-store-feature.constants';

export function withCategories() {
  return signalStoreFeature(
    withEntities(categoryConfig),
    withMethods((store) => ({
      setCategories(categories: CategoryDomainModel[]): void {
        patchState(store, setAllEntities(categories, categoryConfig));
      },
      upsertCategory(category: CategoryDomainModel): void {
        patchState(store, setEntity(category, categoryConfig));
      },
      removeCategory(id: string): void {
        patchState(store, removeEntity(id, categoryConfig));
      },
    })),
  );
}
