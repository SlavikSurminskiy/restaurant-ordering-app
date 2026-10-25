import { Service } from '@angular/core';

import {
  DishDomainModel,
  CategoryDomainModel,
} from '../../../shared/domain/menu-admin/menu-admin-domain.models';

import { SetupMenuSection } from './setup-menu-store.models';

@Service()
export class SetupMenuStoreService {
  buildSections(
    categories: CategoryDomainModel[],
    dishes: DishDomainModel[],
  ): SetupMenuSection[] {
    const dishesByCategory = new Map<string, DishDomainModel[]>(
      categories.map((category) => [category.id, []]),
    );

    for (const dish of dishes) {
      dishesByCategory.get(dish.categoryId)?.push(dish);
    }

    return categories.map((category) => ({
      category,
      dishes: dishesByCategory.get(category.id) ?? [],
    }));
  }
}
