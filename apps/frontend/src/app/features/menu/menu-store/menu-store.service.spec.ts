import { HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { defer, of, Subject, throwError } from 'rxjs';
import type { Mock, Mocked } from 'vitest';

import {
  Category,
  Dish,
  MenuEventType,
  ServerEvent,
} from '@restaurant/shared-api-types';

import { ApiError } from '../../../core/http/api-error';
import { SseService } from '../../../core/realtime/sse.service';
import { BACKOFF_BASE_DELAY_MS } from '../../../core/realtime/utils/backoff-delay';
import { MenuDomainModel } from '../../../shared/domain/domain.models';
import { DomainService } from '../../../shared/domain/domain.service';

import { SNAPSHOT_FALLBACK_DELAY_MS } from './menu-store.constants';
import { MenuUpdateKind } from './menu-store.enums';
import { MenuEntitiesState, MenuUpdate } from './menu-store.models';
import { MenuStoreService } from './menu-store.service';

describe(MenuStoreService.name, () => {
  describe('menuUpdates', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should load the snapshot only when the event stream opens', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const received: MenuUpdate[] = [];
      service.menuUpdates().subscribe((update) => received.push(update));
      expect(spies.domainServiceMock.getMenu).not.toHaveBeenCalled();

      spies.sseServiceMock.opened$.next();

      expect(received).toEqual([
        { kind: MenuUpdateKind.Snapshot, menu: Arrange.createMenu() },
      ]);
    });

    it('should load a fresh snapshot on every reconnect', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      service.menuUpdates().subscribe();

      spies.sseServiceMock.opened$.next();
      spies.sseServiceMock.opened$.next();

      expect(spies.domainServiceMock.getMenu).toHaveBeenCalledTimes(2);
    });

    it('should load the snapshot anyway when the stream does not open in time', () => {
      vi.useFakeTimers();
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      service.menuUpdates().subscribe();

      vi.advanceTimersByTime(SNAPSHOT_FALLBACK_DELAY_MS - 1);
      expect(spies.domainServiceMock.getMenu).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(spies.domainServiceMock.getMenu).toHaveBeenCalledOnce();

      spies.sseServiceMock.opened$.next();
      expect(spies.domainServiceMock.getMenu).toHaveBeenCalledTimes(2);
    });

    it('should not fall back once the stream has opened', () => {
      vi.useFakeTimers();
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      service.menuUpdates().subscribe();

      spies.sseServiceMock.opened$.next();
      vi.advanceTimersByTime(SNAPSHOT_FALLBACK_DELAY_MS);

      expect(spies.domainServiceMock.getMenu).toHaveBeenCalledOnce();
    });

    it('should emit the snapshot, then events from the load, then live ones', () => {
      const duringLoad = Arrange.createDishDeleted('d-greek');
      const live = Arrange.createDishDeleted('d-borscht');
      const spies = Arrange.createSpies();
      const snapshot = new Subject<MenuDomainModel>();
      spies.domainServiceMock.getMenu.mockReturnValue(snapshot);
      const service = Arrange.setup(spies);
      const received: MenuUpdate[] = [];
      service.menuUpdates().subscribe((update) => received.push(update));
      spies.sseServiceMock.opened$.next();

      spies.sseServiceMock.events$.next(duringLoad);
      expect(received).toEqual([]);

      snapshot.next(Arrange.createMenu());
      spies.sseServiceMock.events$.next(live);

      expect(received).toEqual([
        { kind: MenuUpdateKind.Snapshot, menu: Arrange.createMenu() },
        { kind: MenuUpdateKind.Event, event: duringLoad },
        { kind: MenuUpdateKind.Event, event: live },
      ]);
    });

    it('should report a failed load, keep buffering and retry with backoff', () => {
      vi.useFakeTimers();
      const error = Arrange.createNotFoundError();
      const duringLoad = Arrange.createDishDeleted('d-greek');
      const spies = Arrange.createSpies();
      spies.domainServiceMock.getMenu.mockReturnValue(
        Arrange.createFailingOnce(Arrange.createMenu(), error),
      );
      const service = Arrange.setup(spies);
      const received: MenuUpdate[] = [];
      service.menuUpdates().subscribe((update) => received.push(update));
      spies.sseServiceMock.opened$.next();

      spies.sseServiceMock.events$.next(duringLoad);
      expect(received).toEqual([
        { kind: MenuUpdateKind.SnapshotFailed, error },
      ]);

      vi.advanceTimersByTime(BACKOFF_BASE_DELAY_MS);
      expect(received).toEqual([
        { kind: MenuUpdateKind.SnapshotFailed, error },
        { kind: MenuUpdateKind.Snapshot, menu: Arrange.createMenu() },
        { kind: MenuUpdateKind.Event, event: duringLoad },
      ]);
    });

    it('should drop a load replaced by a reconnect and emit only the newer snapshot', () => {
      const duringLoad = Arrange.createDishDeleted('d-greek');
      const spies = Arrange.createSpies();
      const first = new Subject<MenuDomainModel>();
      const second = new Subject<MenuDomainModel>();
      spies.domainServiceMock.getMenu
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const service = Arrange.setup(spies);
      const received: MenuUpdate[] = [];
      service.menuUpdates().subscribe((update) => received.push(update));

      spies.sseServiceMock.opened$.next();
      spies.sseServiceMock.opened$.next();
      spies.sseServiceMock.events$.next(duringLoad);
      first.next({ categories: [], dishes: [] });
      second.next(Arrange.createMenu());

      expect(received).toEqual([
        { kind: MenuUpdateKind.Snapshot, menu: Arrange.createMenu() },
        { kind: MenuUpdateKind.Event, event: duringLoad },
      ]);
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
  domainServiceMock: { getMenu: Mock };
  sseServiceMock: {
    opened$: Subject<void>;
    events$: Subject<ServerEvent>;
  };
}

const Arrange = {
  setup(spies: Spies = Arrange.createSpies()) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DomainService, useValue: spies.domainServiceMock },
        { provide: SseService, useValue: spies.sseServiceMock },
      ],
    });

    return TestBed.inject(MenuStoreService);
  },

  createSpies(): Spies {
    return {
      domainServiceMock: {
        getMenu: vi.fn().mockReturnValue(of(Arrange.createMenu())),
      } satisfies Mocked<Pick<DomainService, 'getMenu'>>,
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

  /** Fails on the first subscription and succeeds on the next, like a retried request. */
  createFailingOnce(menu: MenuDomainModel, error: ApiError) {
    let subscriptions = 0;

    return defer(() =>
      ++subscriptions === 1 ? throwError(() => error) : of(menu),
    );
  },

  createNotFoundError(): ApiError {
    return new ApiError(
      HttpStatusCode.NotFound,
      'The requested data was not found.',
    );
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
