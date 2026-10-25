import {
  DishDomainModel,
  CategoryDomainModel,
} from '../../../shared/domain/menu-admin/menu-admin-domain.models';

export interface SetupMenuSection {
  category: CategoryDomainModel;
  dishes: DishDomainModel[];
}
