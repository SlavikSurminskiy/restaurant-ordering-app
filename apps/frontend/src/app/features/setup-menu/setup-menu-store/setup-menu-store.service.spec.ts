import { TestBed } from '@angular/core/testing';

import {
  DishDomainModel,
  CategoryDomainModel,
} from '../../../shared/domain/menu-admin/menu-admin-domain.models';

import { SetupMenuStoreService } from './setup-menu-store.service';

describe(SetupMenuStoreService.name, () => {
  describe('buildSections', () => {
    it('should group dishes under their categories in category order', () => {
      const service = Arrange.setup();
      const [salads, soups] = Arrange.createCategories();
      const caesar = Arrange.createDish('d-caesar', salads.id);
      const borscht = Arrange.createDish('d-borscht', soups.id);

      expect(service.buildSections([salads, soups], [borscht, caesar])).toEqual(
        [
          { category: salads, dishes: [caesar] },
          { category: soups, dishes: [borscht] },
        ],
      );
    });

    it('should keep empty categories', () => {
      const service = Arrange.setup();
      const [salads] = Arrange.createCategories();

      expect(service.buildSections([salads], [])).toEqual([
        { category: salads, dishes: [] },
      ]);
    });

    it('should leave out dishes of unknown categories', () => {
      const service = Arrange.setup();
      const [salads] = Arrange.createCategories();

      expect(
        service.buildSections([salads], [Arrange.createDish('d-1', 'c-gone')]),
      ).toEqual([{ category: salads, dishes: [] }]);
    });
  });
});

const Arrange = {
  setup() {
    return TestBed.inject(SetupMenuStoreService);
  },

  createCategories(): CategoryDomainModel[] {
    return [
      { id: 'c-salads', name: 'Salads' },
      { id: 'c-soups', name: 'Soups' },
    ];
  },

  createDish(id: string, categoryId: string): DishDomainModel {
    return {
      id,
      categoryId,
      name: id,
      description: '',
      photoUrl: null,
      price: 1000,
      isOpenPrice: false,
      available: true,
    };
  },
};
