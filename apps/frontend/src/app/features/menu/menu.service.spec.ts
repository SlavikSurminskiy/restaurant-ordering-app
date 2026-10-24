import { describe } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { Dish } from '@restaurant/shared-api-types';

import { MenuSectionDomainModel } from '../../shared/domain/domain.models';

import { MenuRow, MenuRowKind } from './menu.models';
import { MenuService } from './menu.service';

describe(MenuService.name, () => {
  describe('buildFlatMenuRows', () => {
    it('should put each category header before its dishes, in menu order', () => {
      const service = Arrange.setup();

      const rows = service.buildFlatMenuRows(Arrange.createSections());

      expect(Arrange.keys(service, rows)).toEqual([
        'category:c-salads',
        'dish:d-caesar',
        'dish:d-greek',
        'category:c-soups',
        'dish:d-chef-soup',
      ]);
    });

    it('should skip the header of a section without dishes', () => {
      const service = Arrange.setup();
      const [salads, soups] = Arrange.createSections();

      const rows = service.buildFlatMenuRows([
        { ...salads, dishes: [] },
        soups,
      ]);

      expect(Arrange.keys(service, rows)).toEqual([
        'category:c-soups',
        'dish:d-chef-soup',
      ]);
    });
  });

  describe('filterSections', () => {
    it('should match the search in name or description, ignoring case and spaces', () => {
      const service = Arrange.setup();

      const sections = service.filterSections(
        Arrange.createSections(),
        ' FETA ',
      );

      expect(Arrange.dishIds(sections)).toEqual([['d-greek'], []]);
    });

    it('should keep unavailable dishes that match the search', () => {
      const service = Arrange.setup();

      const sections = service.filterSections(
        Arrange.createSections(),
        'salad',
      );

      expect(Arrange.dishIds(sections)).toEqual([['d-greek'], []]);
    });
  });

  it('filterSections with buildFlatMenuRows should drop categories that have no matching dishes', () => {
    const service = Arrange.setup();

    const rows = service.buildFlatMenuRows(
      service.filterSections(Arrange.createSections(), 'sushi'),
    );

    expect(rows).toEqual([]);
  });

  it('isSearchActive should be false for a blank search', () => {
    const service = Arrange.setup();

    expect(service.isSearchActive('')).toBe(false);
    expect(service.isSearchActive('   ')).toBe(false);
    expect(service.isSearchActive('soup')).toBe(true);
  });

  it('rowCategoryId should return the category of a header and of a dish', () => {
    const service = Arrange.setup();
    const [header, dish] = service.buildFlatMenuRows(Arrange.createSections());

    expect(header.kind).toBe(MenuRowKind.Category);
    expect(service.rowCategoryId(header)).toBe('c-salads');
    expect(dish.kind).toBe(MenuRowKind.Dish);
    expect(service.rowCategoryId(dish)).toBe('c-salads');
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({ providers: [MenuService] });

    return TestBed.inject(MenuService);
  },

  createSections(): MenuSectionDomainModel[] {
    const salads = { id: 'c-salads', name: 'Salads' };
    const soups = { id: 'c-soups', name: 'Soups' };

    return [
      {
        category: salads,
        dishes: [
          Arrange.createDish({
            id: 'd-caesar',
            categoryId: salads.id,
            name: 'Chicken Caesar',
            description: 'Romaine, grilled chicken, parmesan',
          }),
          Arrange.createDish({
            id: 'd-greek',
            categoryId: salads.id,
            name: 'Greek Salad',
            description: 'Tomatoes, cucumbers, feta',
            available: false,
          }),
        ],
      },
      {
        category: soups,
        dishes: [
          Arrange.createDish({
            id: 'd-chef-soup',
            categoryId: soups.id,
            name: "Chef's Soup",
            description: 'Ask the waiter',
            price: null,
            isOpenPrice: true,
          }),
        ],
      },
    ];
  },

  createDish(
    dish: Pick<Dish, 'id' | 'categoryId' | 'name'> & Partial<Dish>,
  ): Dish {
    return {
      description: '',
      photoUrl: null,
      price: 1000,
      isOpenPrice: false,
      available: true,
      ...dish,
    };
  },

  keys(service: MenuService, rows: MenuRow[]): string[] {
    return rows.map((row) => service.rowKey(row));
  },

  dishIds(sections: MenuSectionDomainModel[]): string[][] {
    return sections.map(({ dishes }) => dishes.map(({ id }) => id));
  },
};
