import { inject, Service } from '@angular/core';
import { catchError, filter, Observable, of, Subject } from 'rxjs';

import type { MenuEvent, ServerEvent } from '@restaurant/shared-api-types';
import { MenuDataAccessService } from '@restaurant/frontend/data-access/menu';
import { SseDataAccessService } from '@restaurant/frontend/data-access/sse';
import { LiveResourceFactoryService } from '@restaurant/frontend/domain/sse';

import { MENU_EVENT_TYPES } from './menu-domain.constants';
import {
  MenuDomainModel,
  MenuStreamUpdate,
  DiscountDomainModel,
} from './menu-domain.models';

@Service()
export class MenuDomainService {
  #menuDataAccess = inject(MenuDataAccessService);
  #sseDataAccess = inject(SseDataAccessService);
  #liveResourceFactory = inject(LiveResourceFactoryService);
  #reloadRequests = new Subject<void>();

  getMenu(): Observable<MenuDomainModel> {
    return this.#menuDataAccess.getMenu();
  }

  getOrderDiscount(): Observable<DiscountDomainModel> {
    return this.#menuDataAccess
      .getDiscount()
      .pipe(catchError(() => of({ discount: 0 })));
  }

  streamMenu(): Observable<MenuStreamUpdate> {
    return this.#liveResourceFactory.create({
      loadSnapshot: () => this.getMenu(),
      events$: this.#sseDataAccess
        .serverEvents()
        .pipe(filter((event) => this.#isMenuEvent(event))),
      reload$: this.#reloadRequests,
    });
  }

  reloadMenu(): void {
    this.#reloadRequests.next();
  }

  #isMenuEvent(event: ServerEvent): event is MenuEvent {
    return MENU_EVENT_TYPES.includes(event.type);
  }
}
