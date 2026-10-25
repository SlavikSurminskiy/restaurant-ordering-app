import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  Dish,
  Category,
  CreateDishRequest,
  UpdateDishRequest,
  UpdateCategoryRequest,
  CreateCategoryRequest,
} from './menu-admin-data-access.models';

@Service()
export class MenuAdminDataAccessService {
  #http = inject(HttpClient);

  createCategory(request: CreateCategoryRequest) {
    return this.#http.post<Category>('/api/menu/categories', request);
  }

  updateCategory(id: string, request: UpdateCategoryRequest) {
    return this.#http.patch<Category>(`/api/menu/categories/${id}`, request);
  }

  deleteCategory(id: string) {
    return this.#http.delete<void>(`/api/menu/categories/${id}`);
  }

  createDish(request: CreateDishRequest) {
    return this.#http.post<Dish>('/api/menu/dishes', request);
  }

  updateDish(id: string, request: UpdateDishRequest) {
    return this.#http.patch<Dish>(`/api/menu/dishes/${id}`, request);
  }

  deleteDish(id: string) {
    return this.#http.delete<void>(`/api/menu/dishes/${id}`);
  }
}
