import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import { OrderDomainModel } from '@restaurant/frontend/domain/orders';

export const orderConfig = entityConfig({
  entity: type<OrderDomainModel>(),
  collection: 'order',
});
