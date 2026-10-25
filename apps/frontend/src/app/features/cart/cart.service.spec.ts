import { TestBed } from '@angular/core/testing';

import { Dish, OrderConflictReason } from '@restaurant/shared-api-types';

import { CartService } from './cart.service';
import { CartItem } from './cart-store/cart-store.models';

describe(CartService.name, () => {
  describe('findWarnings', () => {
    it('should find nothing when the cart matches the menu', () => {
      const service = Arrange.setup();

      expect(
        service.findWarnings([Arrange.createItem()], {
          'd-caesar': Arrange.createDish(),
        }),
      ).toEqual([]);
    });

    it('should warn about a changed price with the current price', () => {
      const service = Arrange.setup();

      expect(
        service.findWarnings([Arrange.createItem()], {
          'd-caesar': { ...Arrange.createDish(), price: 1490 },
        }),
      ).toEqual([
        {
          dishId: 'd-caesar',
          name: 'Chicken Caesar',
          reason: OrderConflictReason.PriceChanged,
          currentPrice: 1490,
        },
      ]);
    });

    it('should warn about an unavailable dish', () => {
      const service = Arrange.setup();

      expect(
        service.findWarnings([Arrange.createItem()], {
          'd-caesar': { ...Arrange.createDish(), available: false },
        }),
      ).toEqual([
        {
          dishId: 'd-caesar',
          name: 'Chicken Caesar',
          reason: OrderConflictReason.Unavailable,
          currentPrice: null,
        },
      ]);
    });

    it('should warn about a dish that left the menu', () => {
      const service = Arrange.setup();

      expect(service.findWarnings([Arrange.createItem()], {})).toEqual([
        {
          dishId: 'd-caesar',
          name: 'Chicken Caesar',
          reason: OrderConflictReason.Removed,
          currentPrice: null,
        },
      ]);
    });

    it('should take any price the customer entered for an open-price dish', () => {
      const service = Arrange.setup();

      expect(
        service.findWarnings([{ ...Arrange.createItem(), unitPrice: 777 }], {
          'd-caesar': {
            ...Arrange.createDish(),
            price: null,
            isOpenPrice: true,
          },
        }),
      ).toEqual([]);
    });
  });

  it('should name the conflicts after the cart lines', () => {
    const service = Arrange.setup();

    expect(
      service.namedConflicts(
        [
          {
            dishId: 'd-caesar',
            reason: OrderConflictReason.Removed,
            currentPrice: null,
          },
        ],
        { 'd-caesar': Arrange.createItem() },
      ),
    ).toEqual([
      {
        dishId: 'd-caesar',
        name: 'Chicken Caesar',
        reason: OrderConflictReason.Removed,
        currentPrice: null,
      },
    ]);
  });

  it('should build the lines with their totals and warnings', () => {
    const service = Arrange.setup();
    const warning = {
      dishId: 'd-caesar',
      name: 'Chicken Caesar',
      reason: OrderConflictReason.Unavailable,
      currentPrice: null,
    };

    expect(
      service.buildLines(
        [Arrange.createItem()],
        { 'd-caesar': { ...Arrange.createDish(), isOpenPrice: true } },
        [warning],
      ),
    ).toEqual([
      {
        item: Arrange.createItem(),
        isOpenPrice: true,
        total: 2500,
        warning,
      },
    ]);
  });

  it('should build the order request from the cart', () => {
    const service = Arrange.setup();

    expect(service.toRequest([Arrange.createItem()])).toEqual({
      items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }],
    });
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({ providers: [CartService] });

    return TestBed.inject(CartService);
  },

  createItem(): CartItem {
    return {
      dishId: 'd-caesar',
      name: 'Chicken Caesar',
      unitPrice: 1250,
      quantity: 2,
    };
  },

  createDish(): Dish {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: '',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },
};
