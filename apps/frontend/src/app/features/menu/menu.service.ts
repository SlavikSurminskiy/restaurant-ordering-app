import { Service } from '@angular/core';

import { Dish } from '@restaurant/shared-api-types';
import { MenuSectionDomainModel } from '@restaurant/frontend/domain/menu';

import { MenuRow, MenuRowKind } from './menu.models';

@Service()
export class MenuService {
  buildFlatMenuRows(sections: MenuSectionDomainModel[]): MenuRow[] {
    return sections.flatMap(({ category, dishes }): MenuRow[] =>
      dishes.length
        ? [
            { kind: MenuRowKind.Category, category },
            ...dishes.map((dish): MenuRow => ({
              kind: MenuRowKind.Dish,
              dish,
            })),
          ]
        : [],
    );
  }

  isSearchActive(search: string) {
    return search.trim() !== '';
  }

  filterSections(
    sections: MenuSectionDomainModel[],
    search: string,
  ): MenuSectionDomainModel[] {
    const query = search.trim().toLowerCase();

    return sections.map(({ category, dishes }) => ({
      category,
      dishes: dishes.filter((dish) => this.#matches(dish, query)),
    }));
  }

  rowCategoryId(row: MenuRow) {
    return row.kind === MenuRowKind.Category
      ? row.category.id
      : row.dish.categoryId;
  }

  rowKey(row: MenuRow) {
    return row.kind === MenuRowKind.Category
      ? `${MenuRowKind.Category}:${row.category.id}`
      : `${MenuRowKind.Dish}:${row.dish.id}`;
  }

  #matches(dish: Dish, query: string) {
    return (
      dish.name.toLowerCase().includes(query) ||
      dish.description.toLowerCase().includes(query)
    );
  }
}
