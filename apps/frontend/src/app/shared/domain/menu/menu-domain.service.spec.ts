import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Mock, Mocked, vi } from 'vitest';

import { Dish } from '@restaurant/shared-api-types';
import { MenuDataAccessService } from '@restaurant/frontend/data-access/menu';

import { DiscountDomainModel } from './menu-domain.models';
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

interface Spies {
  menuDataAccessServiceMock: {
    getMenu: Mock;
    getDiscount: Mock;
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
      ],
    });

    return TestBed.inject(MenuDomainService);
  },

  createSpies(): Spies {
    return {
      menuDataAccessServiceMock: {
        getMenu: vi.fn().mockReturnValue(of({ categories: [], dishes: [] })),
        getDiscount: vi.fn().mockReturnValue(of(Arrange.getMockedDiscount())),
      } satisfies Mocked<
        Pick<MenuDataAccessService, 'getMenu' | 'getDiscount'>
      >,
    };
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
