import { DishDomainModel } from '../../../shared/domain/menu-admin/menu-admin-domain.models';

export interface DishAvailableChange {
  dish: DishDomainModel;
  available: boolean;
}
