import type { OrderEvent } from '@restaurant/shared-api-types';
import { OrderDomainModel } from '@restaurant/frontend/domain/orders';
import { SnapshotSyncUpdate } from '@restaurant/frontend/core/realtime';

import { LoadStatus } from '../../menu/menu-store/menu-store.enums';

export interface OrdersState {
  status: LoadStatus;
  error: string | null;
}

export type OrderUpdate = SnapshotSyncUpdate<OrderDomainModel[], OrderEvent>;
