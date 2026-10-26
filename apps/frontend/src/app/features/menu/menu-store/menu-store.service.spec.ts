import { TestBed } from '@angular/core/testing';
import type { PartialStateUpdater } from '@ngrx/signals';

import {
  Dish,
  Category,
  MenuEvent,
  MenuEventType,
} from '@restaurant/shared-api-types';
import { LiveResourceUpdateKind } from '@restaurant/frontend/domain/sse';

import { LoadStatus } from './menu-store.enums';
import { MenuEntitiesState, MenuStoreState } from './menu-store.models';
import { MenuStoreService } from './menu-store.service';

describe(MenuStoreService.name, () => {
  describe('buildSections', () => {
    it('should group dishes into sections in category order', () => {
      const salads = Arrange.createCategory();
      const soups = Arrange.createCategory({ id: 'c-soups', name: 'Soups' });
      const desserts = Arrange.createCategory({
        id: 'c-desserts',
        name: 'Desserts',
      });
      const caesar = Arrange.createDish();
      const greek = Arrange.createDish({ id: 'd-greek', name: 'Greek Salad' });
      const borscht = Arrange.createDish({
        id: 'd-borscht',
        categoryId: soups.id,
        name: 'Borscht',
      });
      const service = Arrange.setup();

      const sections = service.buildSections(
        [salads, soups, desserts],
        [greek, borscht, caesar],
      );

      expect(sections).toEqual([
        { category: salads, dishes: [greek, caesar] },
        { category: soups, dishes: [borscht] },
        { category: desserts, dishes: [] },
      ]);
    });

    it('should leave out a dish whose category is unknown', () => {
      const salads = Arrange.createCategory();
      const caesar = Arrange.createDish();
      const borscht = Arrange.createDish({
        id: 'd-borscht',
        categoryId: 'c-soups',
        name: 'Borscht',
      });
      const service = Arrange.setup();

      const sections = service.buildSections([salads], [caesar, borscht]);

      expect(sections).toEqual([{ category: salads, dishes: [caesar] }]);
    });
  });

  describe('menuStreamUpdater', () => {
    it('should replace the whole menu with a snapshot', () => {
      const salads = Arrange.createCategory();
      const caesar = Arrange.createDish();
      const service = Arrange.setup();

      const state = Arrange.applyToStore(
        service.menuStreamUpdater({
          kind: LiveResourceUpdateKind.Snapshot,
          snapshot: { categories: [salads], dishes: [caesar] },
        }),
        Arrange.createStoreState(
          Arrange.createState([], [Arrange.createDish({ id: 'd-old' })]),
          LoadStatus.Loading,
        ),
      );

      expect(state).toEqual(
        Arrange.createStoreState(
          Arrange.createState([salads], [caesar]),
          LoadStatus.Loaded,
        ),
      );
    });

    it('should show a readable error while there is no menu', () => {
      const service = Arrange.setup();

      const state = Arrange.applyToStore(
        service.menuStreamUpdater({
          kind: LiveResourceUpdateKind.SnapshotFailed,
          error: new Error('Failed'),
        }),
        Arrange.createStoreState(
          Arrange.createState([], []),
          LoadStatus.Loading,
        ),
      );

      expect(state.status).toBe(LoadStatus.Error);
      expect(state.error).toBe('Something went wrong. Please try again.');
    });

    it('should keep a shown menu when a reload fails', () => {
      const service = Arrange.setup();
      const shown = Arrange.createStoreState(
        Arrange.createState([Arrange.createCategory()], [Arrange.createDish()]),
        LoadStatus.Loaded,
      );

      const state = Arrange.applyToStore(
        service.menuStreamUpdater({
          kind: LiveResourceUpdateKind.SnapshotFailed,
          error: new Error('Failed'),
        }),
        shown,
      );

      expect(state).toEqual(shown);
    });
  });

  describe('menu events', () => {
    it('should replace an existing dish in place on upsert', () => {
      const caesar = Arrange.createDish();
      const greek = Arrange.createDish({ id: 'd-greek', name: 'Greek Salad' });
      const repriced = { ...caesar, price: 1500 };
      const service = Arrange.setup();

      const state = Arrange.applyEvent(
        service,
        { type: MenuEventType.DishUpserted, dish: repriced },
        Arrange.createState([], [caesar, greek]),
      );

      expect(state.dishIds).toEqual([caesar.id, greek.id]);
      expect(state.dishEntityMap[caesar.id]).toEqual(repriced);
    });

    it('should append a new category on upsert', () => {
      const salads = Arrange.createCategory();
      const soups = Arrange.createCategory({ id: 'c-soups', name: 'Soups' });
      const service = Arrange.setup();

      const state = Arrange.applyEvent(
        service,
        { type: MenuEventType.CategoryUpserted, category: soups },
        Arrange.createState([salads], []),
      );

      expect(state.categoryIds).toEqual([salads.id, soups.id]);
    });

    it('should remove a deleted dish and a deleted category', () => {
      const salads = Arrange.createCategory();
      const caesar = Arrange.createDish();
      const service = Arrange.setup();

      const state = Arrange.applyEvent(
        service,
        { type: MenuEventType.CategoryDeleted, categoryId: salads.id },
        Arrange.applyEvent(
          service,
          { type: MenuEventType.DishDeleted, dishId: caesar.id },
          Arrange.createState([salads], [caesar]),
        ),
      );

      expect(state.dishIds).toEqual([]);
      expect(state.categoryIds).toEqual([]);
    });
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({ providers: [MenuStoreService] });

    return TestBed.inject(MenuStoreService);
  },

  /** Applies one event of the menu stream to a shown menu. */
  applyEvent(
    service: MenuStoreService,
    event: MenuEvent,
    entities: MenuEntitiesState,
  ): MenuStoreState {
    return Arrange.applyToStore(
      service.menuStreamUpdater({ kind: LiveResourceUpdateKind.Event, event }),
      Arrange.createStoreState(entities, LoadStatus.Loaded),
    );
  },

  applyToStore(
    updater: PartialStateUpdater<MenuStoreState>,
    state: MenuStoreState,
  ): MenuStoreState {
    return { ...state, ...updater(state) };
  },

  createStoreState(
    entities: MenuEntitiesState,
    status: LoadStatus,
  ): MenuStoreState {
    return { ...entities, status, error: null };
  },

  createState(categories: Category[], dishes: Dish[]): MenuEntitiesState {
    return {
      categoryIds: categories.map(({ id }) => id),
      categoryEntityMap: Object.fromEntries(
        categories.map((category) => [category.id, category]),
      ),
      dishIds: dishes.map(({ id }) => id),
      dishEntityMap: Object.fromEntries(dishes.map((dish) => [dish.id, dish])),
    };
  },

  createCategory(category: Partial<Category> = {}): Category {
    return { id: 'c-salads', name: 'Salads', ...category };
  },

  createDish(dish: Partial<Dish> = {}): Dish {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: 'Romaine, grilled chicken, parmesan',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
      ...dish,
    };
  },
};
