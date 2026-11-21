import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import {
  INTERNAL_ORDER_PRICING_PATH,
  OrderPricingRequest,
  OrderPricingResponse,
} from '@restaurant/shared-api-types';

import { OrderPricingService } from './order-pricing.service';

/** Called by orders while placing an order; not routed from the browser. */
@Controller()
export class OrderPricingController {
  constructor(private readonly orderPricing: OrderPricingService) {}

  @Post(INTERNAL_ORDER_PRICING_PATH)
  @HttpCode(HttpStatus.OK)
  price(@Body() body: OrderPricingRequest): Promise<OrderPricingResponse> {
    return this.orderPricing.price(body);
  }
}
