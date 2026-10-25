import { DishDomainModel } from '@restaurant/frontend/domain/menu-admin';

export interface DishAvailableChange {
  dish: DishDomainModel;
  available: boolean;
}
