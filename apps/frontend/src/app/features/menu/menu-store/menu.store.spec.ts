import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import {
  Dish,
  Category,
  MenuEvent,
  MenuEventType,
} from '@restaurant/shared-api-types';
import {
  MenuDomainModel,
  MenuDomainService,
} from '@restaurant/frontend/domain/menu';
import { ApiError } from '@restaurant/frontend/core/http';
import { SseService } from '@restaurant/frontend/core/realtime';

import { LoadStatus, MenuUpdateKind } from './menu-store.enums';
import { MenuUpdate } from './menu-store.models';
import { MenuStoreService } from './menu-store.service';
import { MenuStore } from './menu.store';

describe('MenuStore', () => {
  describe('keepMenuUpToDate', () => {
    it('should be loading until the first snapshot', () => {
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);

      store.keepMenuUpToDate();

      expect(store.status()).toBe(LoadStatus.Loading);
      expect(store.sections()).toEqual([]);
    });

    it('should follow the menu updates of the service', () => {
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);

      store.keepMenuUpToDate();
      spies.menuUpdates$.next(Arrange.createSnapshot());

      expect(
        TestBed.inject(MenuStoreService).menuUpdates,
      ).toHaveBeenCalledOnce();

      expect(store.status()).toBe(LoadStatus.Loaded);
    });
  });

  describe('snapshot', () => {
    it('should show the menu from a snapshot', () => {
      const salads = Arrange.createCategory();
      const caesar = Arrange.createDish();
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      store.keepMenuUpToDate();

      spies.menuUpdates$.next(Arrange.createSnapshot());

      expect(store.status()).toBe(LoadStatus.Loaded);

      expect(store.sections()).toEqual([
        { category: salads, dishes: [caesar] },
      ]);
    });

    it('should show a readable error while there is no menu, until a snapshot loads', () => {
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      store.keepMenuUpToDate();

      spies.menuUpdates$.next(Arrange.createSnapshotFailed());
      expect(store.status()).toBe(LoadStatus.Error);
      expect(store.error()).toBe('The requested data was not found.');

      spies.menuUpdates$.next(Arrange.createSnapshot());
      expect(store.status()).toBe(LoadStatus.Loaded);
      expect(store.error()).toBeNull();
    });

    it('should keep a shown menu when a reload fails', () => {
      const caesar = Arrange.createDish();
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      store.keepMenuUpToDate();
      spies.menuUpdates$.next(Arrange.createSnapshot());

      spies.menuUpdates$.next(Arrange.createSnapshotFailed());

      expect(store.status()).toBe(LoadStatus.Loaded);
      expect(store.error()).toBeNull();
      expect(store.dishEntities()).toEqual([caesar]);
    });

    it('should replace the whole menu with a newer snapshot', () => {
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      store.keepMenuUpToDate();
      spies.menuUpdates$.next(Arrange.createSnapshot());

      spies.menuUpdates$.next(
        Arrange.createSnapshot({ categories: [], dishes: [] }),
      );

      expect(store.sections()).toEqual([]);
      expect(store.dishEntities()).toEqual([]);
    });
  });

  describe('events', () => {
    it('should replace a dish with the upserted one', () => {
      const salads = Arrange.createCategory();
      const repriced = Arrange.createDish({ price: 1500, available: false });
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      store.keepMenuUpToDate();
      spies.menuUpdates$.next(Arrange.createSnapshot());

      spies.menuUpdates$.next(
        Arrange.createEvent({
          type: MenuEventType.DishUpserted,
          dish: repriced,
        }),
      );

      expect(store.sections()).toEqual([
        { category: salads, dishes: [repriced] },
      ]);
    });

    it('should show a dish once its category arrives', () => {
      const soups = Arrange.createCategory({ id: 'c-soups', name: 'Soups' });
      const borscht = Arrange.createDish({
        id: 'd-borscht',
        categoryId: soups.id,
        name: 'Borscht',
      });
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      store.keepMenuUpToDate();
      spies.menuUpdates$.next(Arrange.createSnapshot());

      spies.menuUpdates$.next(
        Arrange.createEvent({
          type: MenuEventType.DishUpserted,
          dish: borscht,
        }),
      );
      expect(store.sections()).toHaveLength(1);
      expect(store.dishEntities()).toContainEqual(borscht);

      spies.menuUpdates$.next(
        Arrange.createEvent({
          type: MenuEventType.CategoryUpserted,
          category: soups,
        }),
      );
      expect(store.sections()[1]).toEqual({
        category: soups,
        dishes: [borscht],
      });
    });

    it('should remove deleted dishes and categories', () => {
      const salads = Arrange.createCategory();
      const caesar = Arrange.createDish();
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      store.keepMenuUpToDate();
      spies.menuUpdates$.next(Arrange.createSnapshot());

      spies.menuUpdates$.next(
        Arrange.createEvent({
          type: MenuEventType.DishDeleted,
          dishId: caesar.id,
        }),
      );
      spies.menuUpdates$.next(
        Arrange.createEvent({
          type: MenuEventType.CategoryDeleted,
          categoryId: salads.id,
        }),
      );

      expect(store.sections()).toEqual([]);
      expect(store.dishEntities()).toEqual([]);
    });
  });
});

interface Spies {
  menuUpdates$: Subject<MenuUpdate>;
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuDomainService, useValue: {} },
        { provide: SseService, useValue: {} },
      ],
    });

    vi.spyOn(TestBed.inject(MenuStoreService), 'menuUpdates').mockReturnValue(
      spies.menuUpdates$,
    );

    return TestBed.inject(MenuStore);
  },

  createSpies(): Spies {
    return { menuUpdates$: new Subject<MenuUpdate>() };
  },

  createSnapshot(menu: MenuDomainModel = Arrange.createMenu()): MenuUpdate {
    return { kind: MenuUpdateKind.Snapshot, menu };
  },

  createSnapshotFailed(): MenuUpdate {
    return {
      kind: MenuUpdateKind.SnapshotFailed,
      error: new ApiError(
        HttpStatusCode.NotFound,
        'The requested data was not found.',
      ),
    };
  },

  createEvent(event: MenuEvent): MenuUpdate {
    return { kind: MenuUpdateKind.Event, event };
  },

  createMenu(): MenuDomainModel {
    return {
      categories: [Arrange.createCategory()],
      dishes: [Arrange.createDish()],
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
