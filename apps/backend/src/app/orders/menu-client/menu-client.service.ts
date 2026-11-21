import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpClient } from '@nestjs/http-client';

import {
  INTERNAL_ORDER_PRICING_PATH,
  OrderPricingRequest,
  OrderPricingResponse,
} from '@restaurant/shared-api-types';

/**
 * Asks menu-service for the data an order needs; the base URL and the timeout come from
 * `OrdersModule`. Without the menu no order can be checked, so any failure becomes 503;
 * the checkout retries with the same Idempotency-Key.
 */
@Injectable()
export class MenuClient {
  readonly #logger = new Logger(MenuClient.name);

  constructor(private readonly http: HttpClient) {}

  async getPricing(
    request: OrderPricingRequest,
  ): Promise<OrderPricingResponse> {
    try {
      const { data } = await this.http.post<OrderPricingResponse>(
        INTERNAL_ORDER_PRICING_PATH,
        { json: request },
      );

      return data;
    } catch (error) {
      this.#logger.warn(`Order pricing failed: ${String(error)}`);

      throw new ServiceUnavailableException(
        'The menu is unavailable right now. Try again.',
      );
    }
  }
}
