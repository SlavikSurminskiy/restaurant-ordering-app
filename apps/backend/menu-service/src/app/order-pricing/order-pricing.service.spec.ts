import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { PrismaService } from '@restaurant/database';
import { PricedDish } from '@restaurant/shared-api-types';

import { DiscountService } from '../discount/discount.service';

import {
  OrderPricingService,
  PRICED_DISH_SELECT,
} from './order-pricing.service';

describe(OrderPricingService.name, () => {
  it('should read only the requested dishes', async () => {
    const spies = Arrange.createSpies();
    const service = await Arrange.setup(spies);

    await service.price({ dishIds: ['d-1', 'd-2'] });

    expect(spies.prismaMock.dish.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['d-1', 'd-2'] } },
      select: PRICED_DISH_SELECT,
    });
  });

  it('should return the found dishes and the discount', async () => {
    const dish = Arrange.createDish();
    const spies = Arrange.createSpies();
    spies.prismaMock.dish.findMany.mockResolvedValue([dish]);
    const service = await Arrange.setup(spies);

    await expect(service.price({ dishIds: ['d-1'] })).resolves.toEqual({
      dishes: [dish],
      discount: 500,
    });
  });
});

interface Spies {
  prismaMock: { dish: { findMany: Mock } };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderPricingService,
        { provide: PrismaService, useValue: spies.prismaMock },
        {
          provide: DiscountService,
          useValue: { getDiscount: () => ({ discount: 500 }) },
        },
      ],
    }).compile();

    return moduleRef.get(OrderPricingService);
  },

  createSpies(): Spies {
    return {
      prismaMock: { dish: { findMany: vi.fn().mockResolvedValue([]) } },
    };
  },

  createDish(): PricedDish {
    return {
      id: 'd-1',
      name: 'Soup',
      price: 800,
      isOpenPrice: false,
      available: true,
    };
  },
};
