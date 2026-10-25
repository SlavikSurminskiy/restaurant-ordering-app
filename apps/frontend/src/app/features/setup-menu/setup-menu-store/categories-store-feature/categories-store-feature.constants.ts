import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import type { CategoryDomainModel } from '@restaurant/frontend/domain/menu-admin';

export const categoryConfig = entityConfig({
  entity: type<CategoryDomainModel>(),
  collection: 'category',
});
