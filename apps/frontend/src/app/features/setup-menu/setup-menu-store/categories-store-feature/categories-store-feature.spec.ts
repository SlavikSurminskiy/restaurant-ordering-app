import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';

import { CategoryDomainModel } from '../../../../shared/domain/menu-admin/menu-admin-domain.models';

import { withCategories } from './categories-store-feature';

describe('withCategories', () => {
  it('should replace all categories', () => {
    const store = Arrange.setup();
    store.setCategories([Arrange.createCategory('c-old', 'Old')]);

    store.setCategories([Arrange.createCategory('c-salads', 'Salads')]);

    expect(store.categoryEntities()).toEqual([
      Arrange.createCategory('c-salads', 'Salads'),
    ]);
  });

  it('should add a new category', () => {
    const store = Arrange.setup();
    store.setCategories([Arrange.createCategory('c-salads', 'Salads')]);

    store.upsertCategory(Arrange.createCategory('c-soups', 'Soups'));

    expect(store.categoryIds()).toEqual(['c-salads', 'c-soups']);
  });

  it('should replace a stored category with the same id', () => {
    const store = Arrange.setup();
    store.setCategories([Arrange.createCategory('c-salads', 'Salads')]);

    store.upsertCategory(Arrange.createCategory('c-salads', 'Bowls'));

    expect(store.categoryEntities()).toEqual([
      Arrange.createCategory('c-salads', 'Bowls'),
    ]);
  });

  it('should remove a category', () => {
    const store = Arrange.setup();
    store.setCategories([Arrange.createCategory('c-salads', 'Salads')]);

    store.removeCategory('c-salads');

    expect(store.categoryEntities()).toEqual([]);
  });
});

const TestStore = signalStore(withCategories());

const Arrange = {
  setup() {
    TestBed.configureTestingModule({ providers: [TestStore] });

    return TestBed.inject(TestStore);
  },

  createCategory(id: string, name: string): CategoryDomainModel {
    return { id, name };
  },
};
