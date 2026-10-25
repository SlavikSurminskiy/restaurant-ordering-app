import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { DiscountResponse, MenuResponse } from './menu-data-access.models';

@Service()
export class MenuDataAccessService {
  #http = inject(HttpClient);

  getMenu() {
    return this.#http.get<MenuResponse>('/api/menu');
  }

  getDiscount() {
    return this.#http.get<DiscountResponse>('/api/discount');
  }
}
