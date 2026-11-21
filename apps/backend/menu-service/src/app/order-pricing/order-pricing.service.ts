import { Injectable } from '@nestjs/common';

import { PrismaService } from '@restaurant/database';
import {
  OrderPricingRequest,
  OrderPricingResponse,
} from '@restaurant/shared-api-types';

import { DiscountService } from '../discount/discount.service';

export const PRICED_DISH_SELECT = {
  id: true,
  name: true,
  price: true,
  isOpenPrice: true,
  available: true,
} as const;

@Injectable()
export class OrderPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discount: DiscountService,
  ) {}

  async price({ dishIds }: OrderPricingRequest): Promise<OrderPricingResponse> {
    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: dishIds } },
      select: PRICED_DISH_SELECT,
    });

    return { dishes, discount: this.discount.getDiscount().discount };
  }
}
