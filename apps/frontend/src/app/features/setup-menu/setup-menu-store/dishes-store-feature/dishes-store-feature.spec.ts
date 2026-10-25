import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';

import { DishDomainModel } from '../../../../shared/domain/menu-admin/menu-admin-domain.models';

import { withDishes } from './dishes-store-feature';

describe('withDishes', () => {
  it('should replace all dishes', () => {
    const store = Arrange.setup();
    store.setDishes([Arrange.createDish('d-old')]);

    store.setDishes([Arrange.createDish('d-caesar')]);

    expect(store.dishIds()).toEqual(['d-caesar']);
  });

  it('should add a new dish', () => {
    const store = Arrange.setup();
    store.setDishes([Arrange.createDish('d-caesar')]);

    store.upsertDish(Arrange.createDish('d-greek'));

    expect(store.dishIds()).toEqual(['d-caesar', 'd-greek']);
  });

  it('should replace a stored dish with the same id', () => {
    const store = Arrange.setup();
    store.setDishes([Arrange.createDish('d-caesar')]);

    store.upsertDish({ ...Arrange.createDish('d-caesar'), available: false });

    expect(store.dishEntities()).toEqual([
      { ...Arrange.createDish('d-caesar'), available: false },
    ]);
  });

  it('should remove a dish', () => {
    const store = Arrange.setup();
    store.setDishes([Arrange.createDish('d-caesar')]);

    store.removeDish('d-caesar');

    expect(store.dishEntities()).toEqual([]);
  });
});

const TestStore = signalStore(withDishes());

const Arrange = {
  setup() {
    TestBed.configureTestingModule({ providers: [TestStore] });

    return TestBed.inject(TestStore);
  },

  createDish(id: string): DishDomainModel {
    return {
      id,
      categoryId: 'c-salads',
      name: id,
      description: '',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },
};
