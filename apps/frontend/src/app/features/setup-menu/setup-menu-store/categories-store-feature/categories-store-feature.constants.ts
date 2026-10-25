import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import type { CategoryDomainModel } from '../../../../shared/domain/menu-admin/menu-admin-domain.models';

export const categoryConfig = entityConfig({
  entity: type<CategoryDomainModel>(),
  collection: 'category',
});
