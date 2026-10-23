import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Mock, Mocked, vi } from 'vitest';

import { Dish } from '@restaurant/shared-api-types';

import { DataAccessService } from '../data-access/data-access.service';

import { DiscountDomainModel } from './domain.models';
import { DomainService } from './domain.service';

describe(DomainService.name, () => {
  describe('getMenu', () => {
    it('should group dishes into sections in category order', async () => {
      const salads = { id: 'c-salads', name: 'Salads' };
      const soups = { id: 'c-soups', name: 'Soups' };
      const desserts = { id: 'c-desserts', name: 'Desserts' };
      const caesar = Arrange.createDish({
        id: 'd-caesar',
        categoryId: salads.id,
        name: 'Chicken Caesar',
      });
      const greek = Arrange.createDish({
        id: 'd-greek',
        categoryId: salads.id,
        name: 'Greek Salad',
      });
      const borscht = Arrange.createDish({
        id: 'd-borscht',
        categoryId: soups.id,
        name: 'Borscht',
      });
      const spies = Arrange.createSpies();
      spies.dataAccessServiceMock.getMenu.mockReturnValue(
        of({
          categories: [salads, soups, desserts],
          dishes: [caesar, borscht, greek],
        }),
      );
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getMenu());

      expect(spies.dataAccessServiceMock.getMenu).toHaveBeenCalledTimes(1);

      expect(response).toEqual({
        sections: [
          { category: salads, dishes: [caesar, greek] },
          { category: soups, dishes: [borscht] },
          { category: desserts, dishes: [] },
        ],
      });
    });

    it('should keep the API order of dishes within a section', async () => {
      const salads = { id: 'c-salads', name: 'Salads' };
      const caesar = Arrange.createDish({
        id: 'd-caesar',
        categoryId: salads.id,
        name: 'Chicken Caesar',
      });
      const greek = Arrange.createDish({
        id: 'd-greek',
        categoryId: salads.id,
        name: 'Greek Salad',
      });
      const spies = Arrange.createSpies();
      spies.dataAccessServiceMock.getMenu.mockReturnValue(
        of({ categories: [salads], dishes: [greek, caesar] }),
      );
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getMenu());

      expect(response.sections[0].dishes).toEqual([greek, caesar]);
    });

    it('should drop a dish whose category is missing from the menu', async () => {
      const salads = { id: 'c-salads', name: 'Salads' };
      const caesar = Arrange.createDish({
        id: 'd-caesar',
        categoryId: salads.id,
        name: 'Chicken Caesar',
      });
      const borscht = Arrange.createDish({
        id: 'd-borscht',
        categoryId: 'c-soups',
        name: 'Borscht',
      });
      const spies = Arrange.createSpies();
      spies.dataAccessServiceMock.getMenu.mockReturnValue(
        of({ categories: [salads], dishes: [caesar, borscht] }),
      );
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getMenu());

      expect(response).toEqual({
        sections: [{ category: salads, dishes: [caesar] }],
      });
    });
  });

  describe('getDiscount', () => {
    it('should load discount from the data access service', async () => {
      const spies = Arrange.createSpies();
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getOrderDiscount());

      expect(spies.dataAccessServiceMock.getDiscount).toHaveBeenCalled();

      expect(response).toEqual(Arrange.getMockedDiscount());
    });

    it('should return zero discount when getDiscount fails', async () => {
      const spies = Arrange.createSpies();
      spies.dataAccessServiceMock.getDiscount.mockReturnValue(
        throwError(() => new Error('offline')),
      );
      const service = Arrange.setup(spies);

      const response = await firstValueFrom(service.getOrderDiscount());

      expect(spies.dataAccessServiceMock.getDiscount).toHaveBeenCalled();

      expect(response).toEqual({ discount: 0 });
    });
  });
});

interface Spies {
  dataAccessServiceMock: {
    getMenu: Mock;
    getDiscount: Mock;
  };
}

const Arrange = {
  setup(spies: Spies) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataAccessService,
          useValue: spies.dataAccessServiceMock,
        },
      ],
    });

    return TestBed.inject(DomainService);
  },

  createSpies(): Spies {
    return {
      dataAccessServiceMock: {
        getMenu: vi.fn().mockReturnValue(of({ categories: [], dishes: [] })),
        getDiscount: vi.fn().mockReturnValue(of(Arrange.getMockedDiscount())),
      } satisfies Mocked<Pick<DataAccessService, 'getMenu' | 'getDiscount'>>,
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
