import {
  DishDomainModel,
  CategoryDomainModel,
} from '@restaurant/frontend/domain/menu-admin';

export interface SetupMenuSection {
  category: CategoryDomainModel;
  dishes: DishDomainModel[];
}
