import { inject, Service } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { MenuDataAccessService } from '@restaurant/frontend/data-access/menu';

import { DiscountDomainModel, MenuDomainModel } from './menu-domain.models';

@Service()
export class MenuDomainService {
  #menuDataAccess = inject(MenuDataAccessService);

  getMenu(): Observable<MenuDomainModel> {
    return this.#menuDataAccess.getMenu();
  }

  getOrderDiscount(): Observable<DiscountDomainModel> {
    return this.#menuDataAccess
      .getDiscount()
      .pipe(catchError(() => of({ discount: 0 })));
  }
}
