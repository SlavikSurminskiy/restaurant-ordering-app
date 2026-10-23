import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { DiscountResponse, MenuResponse } from './data-access.models';

@Service()
export class DataAccessService {
  #http = inject(HttpClient);

  getMenu() {
    return this.#http.get<MenuResponse>('/api/menu');
  }

  getDiscount() {
    return this.#http.get<DiscountResponse>('/api/discount');
  }
}
