import { Test } from '@nestjs/testing';

import { OrderConflictReason } from '@restaurant/shared-api-types';

import { OrderConflictsService, OrderedDish } from './order-conflicts.service';

describe(OrderConflictsService.name, () => {
  it('should find nothing when the order matches the menu', async () => {
    const service = await Arrange.setup();

    expect(
      service.find(
        [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }],
        [Arrange.createDish()],
      ),
    ).toEqual([]);
  });

  it('should report a changed price with the current price', async () => {
    const service = await Arrange.setup();

    expect(
      service.find(
        [{ dishId: 'd-caesar', quantity: 1, unitPrice: 1250 }],
        [Arrange.createDish({ price: 1490 })],
      ),
    ).toEqual([
      {
        dishId: 'd-caesar',
        reason: OrderConflictReason.PriceChanged,
        currentPrice: 1490,
      },
    ]);
  });

  it('should report an unavailable dish', async () => {
    const service = await Arrange.setup();

    expect(
      service.find(
        [{ dishId: 'd-caesar', quantity: 1, unitPrice: 1250 }],
        [Arrange.createDish({ available: false })],
      ),
    ).toEqual([
      {
        dishId: 'd-caesar',
        reason: OrderConflictReason.Unavailable,
        currentPrice: null,
      },
    ]);
  });

  it('should report a deleted dish', async () => {
    const service = await Arrange.setup();

    expect(
      service.find([{ dishId: 'd-gone', quantity: 1, unitPrice: 100 }], []),
    ).toEqual([
      {
        dishId: 'd-gone',
        reason: OrderConflictReason.Removed,
        currentPrice: null,
      },
    ]);
  });

  it('should take any price the customer entered for an open-price dish', async () => {
    const service = await Arrange.setup();

    expect(
      service.find(
        [{ dishId: 'd-caesar', quantity: 1, unitPrice: 777 }],
        [Arrange.createDish({ price: null, isOpenPrice: true })],
      ),
    ).toEqual([]);
  });
});

const Arrange = {
  async setup() {
    const moduleRef = await Test.createTestingModule({
      providers: [OrderConflictsService],
    }).compile();

    return moduleRef.get(OrderConflictsService);
  },

  createDish(change: Partial<OrderedDish> = {}): OrderedDish {
    return {
      id: 'd-caesar',
      name: 'Chicken Caesar',
      price: 1250,
      isOpenPrice: false,
      available: true,
      ...change,
    };
  },
};
