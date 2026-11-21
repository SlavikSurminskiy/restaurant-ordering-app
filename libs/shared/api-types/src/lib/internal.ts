// Service-to-service contracts. These paths are outside the public `/api` prefix, so neither
// the Ingress nor the frontend's proxies route them from the browser.
import { Dish } from './menu';
import { Money } from './money';

/** `POST` on the realtime gateway: body is a `ServerEvent` for SSE clients. */
export const INTERNAL_EVENTS_PATH = 'internal/events';

/** `POST` on menu-service: prices, availability and the discount for an order being placed. */
export const INTERNAL_ORDER_PRICING_PATH = 'internal/order-pricing';

export interface OrderPricingRequest {
  dishIds: string[];
}

/** What orders needs from a dish: the price to check and the name to copy into the order. */
export type PricedDish = Pick<
  Dish,
  'id' | 'name' | 'price' | 'isOpenPrice' | 'available'
>;

export interface OrderPricingResponse {
  /** Only dishes that exist; a missing id means the dish was removed. */
  dishes: PricedDish[];
  discount: Money;
}
