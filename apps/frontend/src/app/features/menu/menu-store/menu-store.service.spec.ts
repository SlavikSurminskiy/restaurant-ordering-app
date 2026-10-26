import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import type { Mock, Mocked } from 'vitest';

import {
  Dish,
  Order,
  Category,
  ServerEvent,
  MenuEventType,
  OrderEventType,
} from '@restaurant/shared-api-types';
import {
  MenuDomainModel,
  MenuDomainService,
} from '@restaurant/frontend/domain/menu';
import {
  SseService,
  SnapshotSyncUpdateKind,
} from '@restaurant/frontend/core/realtime';

import { MenuEntitiesState, MenuUpdate } from './menu-store.models';
import { MenuStoreService } from './menu-store.service';

describe(MenuStoreService.name, () => {
  describe('menuUpdates', () => {
    it('should load the menu when the event stream opens', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const received: MenuUpdate[] = [];
      service.menuUpdates().subscribe((update) => received.push(update));

      spies.sseServiceMock.opened$.next();

      expect(received).toEqual([
        {
          kind: SnapshotSyncUpdateKind.Snapshot,
          snapshot: Arrange.createMenu(),
        },
      ]);
    });

    it('should pass on menu events and ignore order events', () => {
      const menuEvent = Arrange.createDishDeleted('d-greek');
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const received: MenuUpdate[] = [];
      service.menuUpdates().subscribe((update) => received.push(update));
      spies.sseServiceMock.opened$.next();

      spies.sseServiceMock.events$.next({
        type: OrderEventType.Updated,
        order: {} as Order,
      });
      spies.sseServiceMock.events$.next(menuEvent);

      expect(received).toEqual([
        {
          kind: SnapshotSyncUpdateKind.Snapshot,
          snapshot: Arrange.createMenu(),
        },
        { kind: SnapshotSyncUpdateKind.Event, event: menuEvent },
      ]);
    });

    it('should load a fresh menu on request', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      service.menuUpdates().subscribe();
      spies.sseServiceMock.opened$.next();

      service.reload();

      expect(spies.menuDomainServiceMock.getMenu).toHaveBeenCalledTimes(2);
    });
  });

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

  describe('eventUpdater', () => {
    it('should replace an existing dish in place on upsert', () => {
      const caesar = Arrange.createDish();
      const greek = Arrange.createDish({ id: 'd-greek', name: 'Greek Salad' });
      const repriced = { ...caesar, price: 1500 };
      const service = Arrange.setup();

      const state = Arrange.apply(
        service.eventUpdater({
          type: MenuEventType.DishUpserted,
          dish: repriced,
        }),
        Arrange.createState([], [caesar, greek]),
      );

      expect(state.dishIds).toEqual([caesar.id, greek.id]);
      expect(state.dishEntityMap[caesar.id]).toEqual(repriced);
    });

    it('should append a new category on upsert', () => {
      const salads = Arrange.createCategory();
      const soups = Arrange.createCategory({ id: 'c-soups', name: 'Soups' });
      const service = Arrange.setup();

      const state = Arrange.apply(
        service.eventUpdater({
          type: MenuEventType.CategoryUpserted,
          category: soups,
        }),
        Arrange.createState([salads], []),
      );

      expect(state.categoryIds).toEqual([salads.id, soups.id]);
    });

    it('should remove a deleted dish and a deleted category', () => {
      const salads = Arrange.createCategory();
      const caesar = Arrange.createDish();
      const service = Arrange.setup();

      const state = Arrange.apply(
        service.eventUpdater({
          type: MenuEventType.CategoryDeleted,
          categoryId: salads.id,
        }),
        Arrange.apply(
          service.eventUpdater({
            type: MenuEventType.DishDeleted,
            dishId: caesar.id,
          }),
          Arrange.createState([salads], [caesar]),
        ),
      );

      expect(state.dishIds).toEqual([]);
      expect(state.categoryIds).toEqual([]);
    });
  });
});

interface Spies {
  menuDomainServiceMock: { getMenu: Mock };
  sseServiceMock: {
    opened$: Subject<void>;
    events$: Subject<ServerEvent>;
  };
}

const Arrange = {
  setup(spies: Spies = Arrange.createSpies()) {
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuDomainService, useValue: spies.menuDomainServiceMock },
        { provide: SseService, useValue: spies.sseServiceMock },
      ],
    });

    return TestBed.inject(MenuStoreService);
  },

  createSpies(): Spies {
    return {
      menuDomainServiceMock: {
        getMenu: vi.fn().mockReturnValue(of(Arrange.createMenu())),
      } satisfies Mocked<Pick<MenuDomainService, 'getMenu'>>,
      sseServiceMock: {
        opened$: new Subject<void>(),
        events$: new Subject<ServerEvent>(),
      } satisfies Pick<SseService, 'opened$' | 'events$'>,
    };
  },

  createMenu(): MenuDomainModel {
    return {
      categories: [Arrange.createCategory()],
      dishes: [Arrange.createDish()],
    };
  },

  createDishDeleted(dishId: string): ServerEvent {
    return { type: MenuEventType.DishDeleted, dishId };
  },

  apply(
    updater: ReturnType<MenuStoreService['eventUpdater']>,
    state: MenuEntitiesState,
  ): MenuEntitiesState {
    return { ...state, ...updater(state) };
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
