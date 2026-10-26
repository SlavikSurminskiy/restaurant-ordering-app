import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

import { OrderEventType } from '@restaurant/shared-api-types';
import { OrderDomainModel } from '@restaurant/frontend/domain/orders';

export const orderConfig = entityConfig({
  entity: type<OrderDomainModel>(),
  collection: 'order',
});

export const ORDER_EVENT_TYPES: readonly string[] =
  Object.values(OrderEventType);
