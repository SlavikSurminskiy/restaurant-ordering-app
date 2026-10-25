import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import type { DishDomainModel } from '@restaurant/frontend/domain/menu-admin';

export const dishConfig = entityConfig({
  entity: type<DishDomainModel>(),
  collection: 'dish',
});
