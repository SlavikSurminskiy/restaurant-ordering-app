import { Test } from '@nestjs/testing';

import { OrderStatus } from '@restaurant/shared-api-types';

import { OrderStatusService } from './order-status.service';

describe(OrderStatusService.name, () => {
  describe('next', () => {
    it.each([
      [OrderStatus.New, OrderStatus.Preparing],
      [OrderStatus.Preparing, OrderStatus.Ready],
      [OrderStatus.Ready, OrderStatus.Completed],
    ])('should move %s on to %s', async (from, to) => {
      const service = await Arrange.setup();

      expect(service.next(from)).toBe(to);
    });

    it.each([[OrderStatus.Completed], [OrderStatus.Cancelled]])(
      'should not move %s on',
      async (status) => {
        const service = await Arrange.setup();

        expect(service.next(status)).toBeNull();
      },
    );
  });

  describe('canChange', () => {
    it.each([
      [OrderStatus.New, OrderStatus.Preparing],
      [OrderStatus.New, OrderStatus.Completed],
      [OrderStatus.Preparing, OrderStatus.Cancelled],
      [OrderStatus.Ready, OrderStatus.Completed],
    ])('should allow %s to %s', async (from, to) => {
      const service = await Arrange.setup();

      expect(service.canChange({ from, to })).toBe(true);
    });

    it.each([
      [OrderStatus.Ready, OrderStatus.New],
      [OrderStatus.Preparing, OrderStatus.Preparing],
      [OrderStatus.Completed, OrderStatus.Cancelled],
      [OrderStatus.Cancelled, OrderStatus.New],
    ])('should not allow %s to %s', async (from, to) => {
      const service = await Arrange.setup();

      expect(service.canChange({ from, to })).toBe(false);
    });
  });
});

const Arrange = {
  async setup() {
    const moduleRef = await Test.createTestingModule({
      providers: [OrderStatusService],
    }).compile();

    return moduleRef.get(OrderStatusService);
  },
};
