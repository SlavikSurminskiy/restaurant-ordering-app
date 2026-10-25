import { TestBed } from '@angular/core/testing';

import { DishDomainModel } from '../../../shared/domain/menu-admin/menu-admin-domain.models';

import { DishDialogMode, DishFormValue } from './dish-dialog.models';
import { DishDialogService } from './dish-dialog.service';

describe(DishDialogService.name, () => {
  describe('toFormValue', () => {
    it('should start a new dish in the given category, available, with no price', () => {
      const service = Arrange.setup();

      expect(
        service.toFormValue({
          mode: DishDialogMode.Create,
          categoryId: 'c-salads',
        }),
      ).toEqual({
        categoryId: 'c-salads',
        name: '',
        description: '',
        photoUrl: '',
        isOpenPrice: false,
        price: null,
        available: true,
      });
    });

    it('should show the price of an existing dish in dollars', () => {
      const service = Arrange.setup();

      expect(
        service.toFormValue({
          mode: DishDialogMode.Edit,
          dish: Arrange.createDish(),
        }),
      ).toEqual({
        categoryId: 'c-salads',
        name: 'Chicken Caesar',
        description: 'Romaine',
        photoUrl: '/dishes/caesar.jpg',
        isOpenPrice: false,
        price: 12.5,
        available: true,
      });
    });
  });

  describe('toRequest', () => {
    it('should send the price in cents and trim the text', () => {
      const service = Arrange.setup();

      expect(
        service.toRequest({
          ...Arrange.createFormValue(),
          name: '  Chicken Caesar ',
          price: 12.99,
        }),
      ).toEqual({
        categoryId: 'c-salads',
        name: 'Chicken Caesar',
        description: 'Romaine',
        photoUrl: '/dishes/caesar.jpg',
        isOpenPrice: false,
        price: 1299,
        available: true,
      });
    });

    it('should send no price for an open-price dish', () => {
      const service = Arrange.setup();

      expect(
        service.toRequest({
          ...Arrange.createFormValue(),
          isOpenPrice: true,
          price: 12.5,
        }).price,
      ).toBeNull();
    });

    it('should send no photo for an empty photo URL', () => {
      const service = Arrange.setup();

      expect(
        service.toRequest({ ...Arrange.createFormValue(), photoUrl: '  ' })
          .photoUrl,
      ).toBeNull();
    });
  });
});

const Arrange = {
  setup() {
    return TestBed.inject(DishDialogService);
  },

  createDish(): DishDomainModel {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: 'Romaine',
      photoUrl: '/dishes/caesar.jpg',
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },

  createFormValue(): DishFormValue {
    return {
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: 'Romaine',
      photoUrl: '/dishes/caesar.jpg',
      isOpenPrice: false,
      price: 12.5,
      available: true,
    };
  },
};
