import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { Mock, Mocked, vi } from 'vitest';

import {
  Dish,
  Order,
  MenuEvent,
  ServerEvent,
  MenuEventType,
  OrderEventType,
} from '@restaurant/shared-api-types';
import { MenuDataAccessService } from '@restaurant/frontend/data-access/menu';
import {
  LiveResourceOptions,
  LiveResourceFactoryService,
} from '@restaurant/frontend/domain/sse';
import { SseDataAccessService } from '@restaurant/frontend/data-access/sse';

import { DiscountDomainModel, MenuDomainModel } from './menu-domain.models';
import { MenuDomainService } from './menu-domain.service';

describe(MenuDomainService.name, () => {
  describe('getMenu', () => {
    it('should return the menu from the data access service', async () => {
      const salads = { id: 'c-salads', name: 'Salads' };
      const caesar = Arrange.createDish({
        id: 'd-caesar',
        categoryId: salads.id,
        name: 'Chicken Caesar',
      });
      const spies = Arrange.createSpies();
      spies.menuDataAccessServiceMock.getMenu.mockReturnValue(
        of({ categories: [salads], dishes: [caesar] }),
      );
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getMenu());

      expect(spies.menuDataAccessServiceMock.getMenu).toHaveBeenCalledTimes(1);

      expect(response).toEqual({ categories: [salads], dishes: [caesar] });
    });
  });

  describe('streamMenu', () => {
    it('should stream the menu snapshot', async () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);

      service.streamMenu().subscribe();
      const { loadSnapshot } = Arrange.lastOptions(spies);

      await expect(firstValueFrom(loadSnapshot())).resolves.toEqual({
        categories: [],
        dishes: [],
      });
    });

    it('should pick only menu events', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const menuEvent: ServerEvent = {
        type: MenuEventType.DishDeleted,
        dishId: 'd-caesar',
      };
      const received: unknown[] = [];
      service.streamMenu().subscribe();
      Arrange.lastOptions(spies).events$.subscribe((event) =>
        received.push(event),
      );

      spies.serverEvents$.next({
        type: OrderEventType.Created,
        order: {} as Order,
      });
      spies.serverEvents$.next(menuEvent);

      expect(received).toEqual([menuEvent]);
    });

    it('should reload the snapshot on request', () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);
      const reloads = vi.fn();
      service.streamMenu().subscribe();
      Arrange.lastOptions(spies).reload$?.subscribe(reloads);

      service.reloadMenu();

      expect(reloads).toHaveBeenCalledOnce();
    });
  });

  describe('getDiscount', () => {
    it('should load discount from the data access service', async () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getOrderDiscount());

      expect(spies.menuDataAccessServiceMock.getDiscount).toHaveBeenCalled();

      expect(response).toEqual(Arrange.getMockedDiscount());
    });

    it('should return zero discount when getDiscount fails', async () => {
      const spies = Arrange.createSpies();
      spies.menuDataAccessServiceMock.getDiscount.mockReturnValue(
        throwError(() => new Error('offline')),
      );
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getOrderDiscount());

      expect(spies.menuDataAccessServiceMock.getDiscount).toHaveBeenCalled();

      expect(response).toEqual({ discount: 0 });
    });
  });
});

type MenuOptions = LiveResourceOptions<MenuDomainModel, MenuEvent>;

interface Spies {
  menuDataAccessServiceMock: {
    getMenu: Mock;
    getDiscount: Mock;
  };
  serverEvents$: Subject<ServerEvent>;
  sseDataAccessServiceMock: { serverEvents: Mock };
  liveResourceFactoryServiceMock: {
    create: Mock<(options: MenuOptions) => Observable<unknown>>;
  };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MenuDataAccessService,
          useValue: spies.menuDataAccessServiceMock,
        },
        {
          provide: SseDataAccessService,
          useValue: spies.sseDataAccessServiceMock,
        },
        {
          provide: LiveResourceFactoryService,
          useValue: spies.liveResourceFactoryServiceMock,
        },
      ],
    });

    return TestBed.inject(MenuDomainService);
  },

  createSpies(): Spies {
    const serverEvents$ = new Subject<ServerEvent>();

    return {
      menuDataAccessServiceMock: {
        getMenu: vi.fn().mockReturnValue(of({ categories: [], dishes: [] })),
        getDiscount: vi.fn().mockReturnValue(of(Arrange.getMockedDiscount())),
      } satisfies Mocked<
        Pick<MenuDataAccessService, 'getMenu' | 'getDiscount'>
      >,
      serverEvents$,
      sseDataAccessServiceMock: {
        serverEvents: vi.fn(() => serverEvents$.asObservable()),
      },
      liveResourceFactoryServiceMock: {
        create: vi.fn(() => new Subject<never>()),
      },
    };
  },

  /** The options the menu stream was created with. */
  lastOptions(spies: Spies): MenuOptions {
    const options = spies.liveResourceFactoryServiceMock.create.mock.lastCall;

    if (!options) {
      throw new Error('The menu stream was not created');
    }

    return options[0];
  },

  createDish(
    dish: Pick<Dish, 'id' | 'categoryId' | 'name'> & Partial<Dish>,
  ): Dish {
    return {
      description: `${dish.name} description`,
      photoUrl: null,
      price: 1000,
      isOpenPrice: false,
      available: true,
      ...dish,
    };
  },

  getMockedDiscount(): DiscountDomainModel {
    return {
      discount: 500,
    };
  },
};
