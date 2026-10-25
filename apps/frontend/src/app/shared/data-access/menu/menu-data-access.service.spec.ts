import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';

import { DiscountResponse, MenuResponse } from './menu-data-access.models';
import { MenuDataAccessService } from './menu-data-access.service';

describe(MenuDataAccessService.name, () => {
  it('getMenu should call http.get with correct URL', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const menu = Arrange.createMenu();

    service.getMenu().subscribe(next);

    const req = httpMock.expectOne('/api/menu');
    req.flush(menu);

    expect(req.request.method).toBe('GET');
    expect(next).toHaveBeenCalledWith(menu);
  });

  it('getDiscount should call http.get with correct URL', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const discount = Arrange.createDiscount();

    service.getDiscount().subscribe(next);

    const req = httpMock.expectOne('/api/discount');
    req.flush(discount);

    expect(req.request.method).toBe('GET');
    expect(next).toHaveBeenCalledWith(discount);
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    return {
      service: TestBed.inject(MenuDataAccessService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  },

  createMenu(): MenuResponse {
    return {
      categories: [{ id: 'c-salads', name: 'Salads' }],
      dishes: [
        {
          id: 'd-caesar',
          categoryId: 'c-salads',
          name: 'Chicken Caesar',
          description: 'Romaine, grilled chicken, parmesan',
          photoUrl: '/dishes/salads/chicken-caesar.jpg',
          price: 1250,
          isOpenPrice: false,
          available: true,
        },
      ],
    };
  },

  createDiscount(): DiscountResponse {
    return { discount: 500 };
  },
};
