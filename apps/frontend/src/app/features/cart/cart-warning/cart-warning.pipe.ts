import { Pipe, PipeTransform } from '@angular/core';

import { OrderConflictReason } from '@restaurant/shared-api-types';
import { formatMoney } from '@restaurant/frontend/ui';

import { CartWarning } from './cart-warning.models';

@Pipe({ name: 'cartWarning' })
export class CartWarningPipe implements PipeTransform {
  transform({ name, reason, currentPrice }: CartWarning): string {
    switch (reason) {
      case OrderConflictReason.PriceChanged:
        return currentPrice === null
          ? `The price of ${name} has changed.`
          : `${name} now costs ${formatMoney(currentPrice)}.`;
      case OrderConflictReason.Unavailable:
        return `${name} is not available right now.`;
      case OrderConflictReason.Removed:
        return `${name} is no longer on the menu.`;
    }
  }
}
