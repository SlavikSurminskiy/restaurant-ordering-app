import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import type { DishDomainModel } from '../../../../shared/domain/menu-admin/menu-admin-domain.models';

export const dishConfig = entityConfig({
  entity: type<DishDomainModel>(),
  collection: 'dish',
});
