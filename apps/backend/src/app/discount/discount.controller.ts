import { Controller, Get } from '@nestjs/common';

import { DiscountService } from './discount.service';
import { DiscountResponseDto } from './discount.dto';

@Controller('discount')
export class DiscountController {
  constructor(private readonly discount: DiscountService) {}

  @Get()
  getDiscount(): DiscountResponseDto {
    return this.discount.getDiscount();
  }
}
