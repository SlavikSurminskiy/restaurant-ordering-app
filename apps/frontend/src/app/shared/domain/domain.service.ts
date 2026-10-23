import { inject, Service } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { Dish, MenuResponse } from '@restaurant/shared-api-types';

import { DataAccessService } from '../data-access/data-access.service';

import { DiscountDomainModel, MenuDomainModel } from './domain.models';

@Service()
export class DomainService {
  #dataAccess = inject(DataAccessService);

  getMenu(): Observable<MenuDomainModel> {
    return this.#dataAccess
      .getMenu()
      .pipe(map((menu) => this.#buildMenu(menu)));
  }

  getOrderDiscount(): Observable<DiscountDomainModel> {
    return this.#dataAccess
      .getDiscount()
      .pipe(catchError(() => of({ discount: 0 })));
  }

  #buildMenu({ categories, dishes }: MenuResponse): MenuDomainModel {
    const dishesByCategory = new Map<string, Dish[]>(
      categories.map((category) => [category.id, []]),
    );

    for (const dish of dishes) {
      dishesByCategory.get(dish.categoryId)?.push(dish);
    }

    return {
      sections: categories.map((category) => ({
        category,
        dishes: dishesByCategory.get(category.id) ?? [],
      })),
    };
  }
}
