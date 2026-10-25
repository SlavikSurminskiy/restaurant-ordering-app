import { OrderConflictDomainModel } from '@restaurant/frontend/domain/orders';

export interface CartWarning extends OrderConflictDomainModel {
  name: string;
}
