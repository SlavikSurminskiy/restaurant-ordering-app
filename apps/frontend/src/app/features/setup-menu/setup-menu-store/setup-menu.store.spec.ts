import { TestBed } from '@angular/core/testing';

import {
  DishDomainModel,
  CategoryDomainModel,
} from '../../../shared/domain/menu-admin/menu-admin-domain.models';

import { SetupMenuStore } from './setup-menu.store';
import { SetupMenuStoreService } from './setup-menu-store.service';

describe('SetupMenuStore', () => {
  it('should start empty', () => {
    const store = Arrange.setup();

    expect(store.sections()).toEqual([]);
  });

  it('should show the loaded menu as sections', () => {
    const store = Arrange.setup();

    store.setMenu({
      categories: [Arrange.createCategory()],
      dishes: [Arrange.createDish()],
    });

    expect(store.sections()).toEqual([
      { category: Arrange.createCategory(), dishes: [Arrange.createDish()] },
    ]);
  });

  it('should keep the sections in step with saved changes', () => {
    const store = Arrange.setup();
    store.setMenu({
      categories: [Arrange.createCategory()],
      dishes: [Arrange.createDish()],
    });

    store.removeDish(Arrange.createDish().id);

    expect(store.sections()).toEqual([
      { category: Arrange.createCategory(), dishes: [] },
    ]);
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({
      providers: [SetupMenuStore, SetupMenuStoreService],
    });

    return TestBed.inject(SetupMenuStore);
  },

  createCategory(): CategoryDomainModel {
    return { id: 'c-salads', name: 'Salads' };
  },

  createDish(): DishDomainModel {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: '',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },
};
