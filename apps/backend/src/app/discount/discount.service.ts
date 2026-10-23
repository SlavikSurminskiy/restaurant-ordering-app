import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Money, DiscountResponse } from '@restaurant/shared-api-types';

@Injectable()
export class DiscountService {
  readonly discount: Money;

  constructor(config: ConfigService) {
    const raw = config.get<string>('ORDER_DISCOUNT', '0');

    this.discount = Number(raw);

    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(this.discount)) {
      throw new Error('ORDER_DISCOUNT must be a non-negative integer (cents)');
    }
  }

  getDiscount(): DiscountResponse {
    return { discount: this.discount };
  }
}
