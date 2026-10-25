import { Money } from '@restaurant/shared-api-types';

import { CartItem } from './cart-store/cart-store.models';
import { CartWarning } from './cart-warning/cart-warning.models';

export interface CartLineModel {
  item: CartItem;
  isOpenPrice: boolean;
  total: Money;
  warning: CartWarning | null;
}
