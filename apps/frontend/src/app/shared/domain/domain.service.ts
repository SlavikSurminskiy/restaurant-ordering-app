import { inject, Service } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { DataAccessService } from '../data-access/data-access.service';

import { DiscountDomainModel, MenuDomainModel } from './domain.models';

@Service()
export class DomainService {
  #dataAccess = inject(DataAccessService);

  getMenu(): Observable<MenuDomainModel> {
    return this.#dataAccess.getMenu();
  }

  getOrderDiscount(): Observable<DiscountDomainModel> {
    return this.#dataAccess
      .getDiscount()
      .pipe(catchError(() => of({ discount: 0 })));
  }
}
