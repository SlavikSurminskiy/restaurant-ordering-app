import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  OrderStatus,
  IDEMPOTENCY_KEY_HEADER,
} from '@restaurant/shared-api-types';

import { CreateOrderRequest, Order } from './orders-data-access.models';
import { OrdersDataAccessService } from './orders-data-access.service';

describe(OrdersDataAccessService.name, () => {
  it('getOrders should get the orders', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();

    service.getOrders().subscribe(next);

    const req = httpMock.expectOne('/api/orders');
    req.flush([Arrange.createOrder()]);

    expect(req.request.method).toBe('GET');
    expect(next).toHaveBeenCalledWith([Arrange.createOrder()]);
  });

  it('updateOrderStatus should patch the status of the order', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();

    service
      .updateOrderStatus('o-1', { status: OrderStatus.Ready })
      .subscribe(next);

    const req = httpMock.expectOne('/api/orders/o-1/status');
    req.flush(Arrange.createOrder());

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: OrderStatus.Ready });
    expect(next).toHaveBeenCalledWith(Arrange.createOrder());
  });

  it('createOrder should post the order with the idempotency key', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const order = Arrange.createOrder();

    service.createOrder(Arrange.createRequest(), 'key-1').subscribe(next);

    const req = httpMock.expectOne('/api/orders');
    req.flush(order);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(Arrange.createRequest());
    expect(req.request.headers.get(IDEMPOTENCY_KEY_HEADER)).toBe('key-1');
    expect(next).toHaveBeenCalledWith(order);
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    return {
      service: TestBed.inject(OrdersDataAccessService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  },

  createRequest(): CreateOrderRequest {
    return { items: [{ dishId: 'd-caesar', quantity: 2, unitPrice: 1250 }] };
  },

  createOrder(): Order {
    return {
      id: 'o-1',
      userId: 'u-customer',
      userName: 'Customer',
      status: OrderStatus.New,
      items: [
        {
          id: 'i-1',
          dishId: 'd-caesar',
          name: 'Chicken Caesar',
          unitPrice: 1250,
          quantity: 2,
        },
      ],
      subtotal: 2500,
      discount: 500,
      total: 2000,
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    };
  },
};
