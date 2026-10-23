import { Pipe, PipeTransform } from '@angular/core';

import { Money } from '@restaurant/shared-api-types';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatMoney(value: Money): string {
  return usd.format(value / 100);
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: Money): string {
    return formatMoney(value);
  }
}
