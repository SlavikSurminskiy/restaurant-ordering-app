import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, map } from 'rxjs';

import { Money } from '@restaurant/shared-api-types';
import { MenuDomainService } from './shared/domain/menu/menu-domain.service';

export interface AppData {
  discount: Money;
}

export const appResolver: ResolveFn<AppData> = () =>
  forkJoin({
    discount: inject(MenuDomainService)
      .getOrderDiscount()
      .pipe(map(({ discount }) => discount)),
  });
