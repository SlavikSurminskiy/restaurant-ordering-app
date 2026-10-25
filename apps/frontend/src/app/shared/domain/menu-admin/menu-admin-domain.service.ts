import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { MenuAdminDataAccessService } from '../../data-access/menu-admin/menu-admin-data-access.service';

import {
  DishDomainModel,
  CategoryDomainModel,
  UpdateDishDomainModel,
  CreateDishDomainModel,
  UpdateCategoryDomainModel,
  CreateCategoryDomainModel,
} from './menu-admin-domain.models';

@Service()
export class MenuAdminDomainService {
  #menuAdminDataAccess = inject(MenuAdminDataAccessService);

  createCategory(
    request: CreateCategoryDomainModel,
  ): Observable<CategoryDomainModel> {
    return this.#menuAdminDataAccess.createCategory(request);
  }

  updateCategory(
    id: string,
    changes: UpdateCategoryDomainModel,
  ): Observable<CategoryDomainModel> {
    return this.#menuAdminDataAccess.updateCategory(id, changes);
  }

  deleteCategory(id: string): Observable<void> {
    return this.#menuAdminDataAccess.deleteCategory(id);
  }

  createDish(request: CreateDishDomainModel): Observable<DishDomainModel> {
    return this.#menuAdminDataAccess.createDish(request);
  }

  updateDish(
    id: string,
    changes: UpdateDishDomainModel,
  ): Observable<DishDomainModel> {
    return this.#menuAdminDataAccess.updateDish(id, changes);
  }

  deleteDish(id: string): Observable<void> {
    return this.#menuAdminDataAccess.deleteDish(id);
  }
}
