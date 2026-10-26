import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import {
  Dish,
  Category,
  MenuEvent,
  MenuEventType,
} from '@restaurant/shared-api-types';
import {
  MenuDomainModel,
  MenuStreamUpdate,
  MenuDomainService,
} from '@restaurant/frontend/domain/menu';
import { ApiError } from '@restaurant/frontend/core/http';
import { LiveResourceUpdateKind } from '@restaurant/frontend/domain/sse';

import { LoadStatus } from './menu-store.enums';
import { MenuStore } from './menu.store';

describe('MenuStore', () => {
  it('should ask the domain for a fresh snapshot', () => {
    const spies = Arrange.createSpies();
    const store = Arrange.setup(spies);

    store.reloadMenu();

    expect(spies.menuDomainServiceMock.reloadMenu).toHaveBeenCalledOnce();
  });

  describe('menu stream', () => {
    it('should start streaming the menu once it is created', () => {
      const spies = Arrange.createSpies();

      Arrange.setup(spies);

      expect(spies.menuDomainServiceMock.streamMenu).toHaveBeenCalledOnce();
    });

    it('should be loading until the first snapshot', () => {
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);

      expect(store.status()).toBe(LoadStatus.Loading);
      expect(store.sections()).toEqual([]);
    });
  });

  describe('snapshot', () => {
    it('should show the menu from a snapshot', () => {
      const salads = Arrange.createCategory();
      const caesar = Arrange.createDish();
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);

      spies.menuStream$.next(Arrange.createSnapshot());

      expect(store.status()).toBe(LoadStatus.Loaded);

      expect(store.sections()).toEqual([
        { category: salads, dishes: [caesar] },
      ]);
    });

    it('should show a readable error while there is no menu, until a snapshot loads', () => {
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);

      spies.menuStream$.next(Arrange.createSnapshotFailed());
      expect(store.status()).toBe(LoadStatus.Error);
      expect(store.error()).toBe('The requested data was not found.');

      spies.menuStream$.next(Arrange.createSnapshot());
      expect(store.status()).toBe(LoadStatus.Loaded);
      expect(store.error()).toBeNull();
    });

    it('should keep a shown menu when a reload fails', () => {
      const caesar = Arrange.createDish();
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      spies.menuStream$.next(Arrange.createSnapshot());

      spies.menuStream$.next(Arrange.createSnapshotFailed());

      expect(store.status()).toBe(LoadStatus.Loaded);
      expect(store.error()).toBeNull();
      expect(store.dishEntities()).toEqual([caesar]);
    });

    it('should replace the whole menu with a newer snapshot', () => {
      const spies = Arrange.createSpies();
      const store = Arrange.setup(spies);
      spies.menuStream$.next(Arrange.createSnapshot());

      spies.menuStream$.next(
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
      spies.menuStream$.next(Arrange.createSnapshot());

      spies.menuStream$.next(
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
      spies.menuStream$.next(Arrange.createSnapshot());

      spies.menuStream$.next(
        Arrange.createEvent({
          type: MenuEventType.DishUpserted,
          dish: borscht,
        }),
      );
      expect(store.sections()).toHaveLength(1);
      expect(store.dishEntities()).toContainEqual(borscht);

      spies.menuStream$.next(
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
      spies.menuStream$.next(Arrange.createSnapshot());

      spies.menuStream$.next(
        Arrange.createEvent({
          type: MenuEventType.DishDeleted,
          dishId: caesar.id,
        }),
      );
      spies.menuStream$.next(
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
  menuStream$: Subject<MenuStreamUpdate>;
  menuDomainServiceMock: { streamMenu: Mock; reloadMenu: Mock };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuDomainService, useValue: spies.menuDomainServiceMock },
      ],
    });

    return TestBed.inject(MenuStore);
  },

  createSpies(): Spies {
    const menuStream$ = new Subject<MenuStreamUpdate>();

    return {
      menuStream$,
      menuDomainServiceMock: {
        streamMenu: vi.fn(() => menuStream$.asObservable()),
        reloadMenu: vi.fn(),
      },
    };
  },

  createSnapshot(
    menu: MenuDomainModel = Arrange.createMenu(),
  ): MenuStreamUpdate {
    return { kind: LiveResourceUpdateKind.Snapshot, snapshot: menu };
  },

  createSnapshotFailed(): MenuStreamUpdate {
    return {
      kind: LiveResourceUpdateKind.SnapshotFailed,
      error: new ApiError(
        HttpStatusCode.NotFound,
        'The requested data was not found.',
      ),
    };
  },

  createEvent(event: MenuEvent): MenuStreamUpdate {
    return { kind: LiveResourceUpdateKind.Event, event };
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
