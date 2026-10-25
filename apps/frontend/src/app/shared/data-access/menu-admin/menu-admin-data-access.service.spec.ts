import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  Dish,
  Category,
  CreateDishRequest,
} from './menu-admin-data-access.models';
import { MenuAdminDataAccessService } from './menu-admin-data-access.service';

describe(MenuAdminDataAccessService.name, () => {
  it('createCategory should post the category', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const category = Arrange.createCategory();

    service.createCategory({ name: category.name }).subscribe(next);

    const req = httpMock.expectOne('/api/menu/categories');
    req.flush(category);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: category.name });
    expect(next).toHaveBeenCalledWith(category);
  });

  it('updateCategory should patch the category by id', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const category = Arrange.createCategory();

    service
      .updateCategory(category.id, { name: category.name })
      .subscribe(next);

    const req = httpMock.expectOne(`/api/menu/categories/${category.id}`);
    req.flush(category);

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: category.name });
    expect(next).toHaveBeenCalledWith(category);
  });

  it('deleteCategory should delete the category by id', () => {
    const { service, httpMock } = Arrange.setup();
    const { id } = Arrange.createCategory();

    service.deleteCategory(id).subscribe();

    const req = httpMock.expectOne(`/api/menu/categories/${id}`);
    req.flush(null);

    expect(req.request.method).toBe('DELETE');
  });

  it('createDish should post the dish', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const request = Arrange.createDishRequest();
    const dish = Arrange.createDish();

    service.createDish(request).subscribe(next);

    const req = httpMock.expectOne('/api/menu/dishes');
    req.flush(dish);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(next).toHaveBeenCalledWith(dish);
  });

  it('updateDish should patch the dish by id', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const dish = Arrange.createDish();

    service.updateDish(dish.id, { available: false }).subscribe(next);

    const req = httpMock.expectOne(`/api/menu/dishes/${dish.id}`);
    req.flush(dish);

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ available: false });
    expect(next).toHaveBeenCalledWith(dish);
  });

  it('deleteDish should delete the dish by id', () => {
    const { service, httpMock } = Arrange.setup();
    const { id } = Arrange.createDish();

    service.deleteDish(id).subscribe();

    const req = httpMock.expectOne(`/api/menu/dishes/${id}`);
    req.flush(null);

    expect(req.request.method).toBe('DELETE');
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    return {
      service: TestBed.inject(MenuAdminDataAccessService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  },

  createCategory(): Category {
    return { id: 'c-salads', name: 'Salads' };
  },

  createDish(): Dish {
    return {
      id: 'd-caesar',
      categoryId: 'c-salads',
      name: 'Chicken Caesar',
      description: '',
      photoUrl: null,
      price: 1250,
      isOpenPrice: false,
      available: true,
    };
  },

  createDishRequest(): CreateDishRequest {
    const {
      categoryId,
      name,
      description,
      photoUrl,
      price,
      isOpenPrice,
      available,
    } = Arrange.createDish();

    return {
      categoryId,
      name,
      description,
      photoUrl,
      price,
      isOpenPrice,
      available,
    };
  },
};
