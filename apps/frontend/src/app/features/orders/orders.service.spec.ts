import { TestBed } from '@angular/core/testing';

import { OrderStatus } from '@restaurant/shared-api-types';
import { OrderDomainModel } from '@restaurant/frontend/domain/orders';

import { OrdersService } from './orders.service';

describe(OrdersService.name, () => {
  it.each([
    [OrderStatus.New, OrderStatus.Preparing],
    [OrderStatus.Preparing, OrderStatus.Ready],
    [OrderStatus.Ready, OrderStatus.Completed],
  ])('should offer to move a %s order to %s', (status, nextStatus) => {
    const service = Arrange.setup();
    const order = Arrange.createOrder(status);

    expect(service.buildCards([order])).toEqual([{ order, nextStatus }]);
  });

  it.each([[OrderStatus.Completed], [OrderStatus.Cancelled]])(
    'should offer nothing for a %s order',
    (status) => {
      const service = Arrange.setup();
      const order = Arrange.createOrder(status);

      expect(service.buildCards([order])).toEqual([
        { order, nextStatus: null },
      ]);
    },
  );
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({ providers: [OrdersService] });

    return TestBed.inject(OrdersService);
  },

  createOrder(status: OrderStatus): OrderDomainModel {
    return {
      id: 'o-1',
      userId: 'u-customer',
      userName: 'Customer',
      status,
      items: [],
      subtotal: 2500,
      discount: 500,
      total: 2000,
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    };
  },
};
