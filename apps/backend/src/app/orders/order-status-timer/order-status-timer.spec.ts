import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { OrdersService } from '../orders.service';

import { STATUS_TICK_MS } from './order-status-timer.constants';
import { OrderStatusTimer } from './order-status-timer';

describe(OrderStatusTimer.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should move statuses on every tick with the configured step', async () => {
    const spies = Arrange.createSpies();
    const timer = await Arrange.setup(spies, {
      ORDER_STATUS_STEP_SECONDS: '30',
    });

    timer.onModuleInit();
    await vi.advanceTimersByTimeAsync(STATUS_TICK_MS * 2);

    expect(spies.ordersServiceMock.advanceStatuses).toHaveBeenCalledTimes(2);
    expect(spies.ordersServiceMock.advanceStatuses).toHaveBeenCalledWith(
      expect.any(Date),
      30_000,
    );
  });

  it('should stop on shutdown', async () => {
    const spies = Arrange.createSpies();
    const timer = await Arrange.setup(spies);

    timer.onModuleInit();
    timer.onModuleDestroy();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('should skip a tick while the previous one is still running', async () => {
    const spies = Arrange.createSpies();
    spies.ordersServiceMock.advanceStatuses.mockReturnValue(
      new Promise(() => undefined),
    );
    const timer = await Arrange.setup(spies);

    void timer.tick();
    void timer.tick();

    expect(spies.ordersServiceMock.advanceStatuses).toHaveBeenCalledOnce();
  });

  it('should keep ticking after a failed tick', async () => {
    const spies = Arrange.createSpies();
    spies.ordersServiceMock.advanceStatuses.mockRejectedValueOnce(
      new Error('Connection lost'),
    );
    const timer = await Arrange.setup(spies);

    await timer.tick();
    await timer.tick();

    expect(spies.ordersServiceMock.advanceStatuses).toHaveBeenCalledTimes(2);
  });

  it.each(['0', '-5', '1.5', 'soon'])(
    'should reject ORDER_STATUS_STEP_SECONDS=%s on startup',
    async (value) => {
      await expect(
        Arrange.setup(Arrange.createSpies(), {
          ORDER_STATUS_STEP_SECONDS: value,
        }),
      ).rejects.toThrow('ORDER_STATUS_STEP_SECONDS');
    },
  );
});

interface Spies {
  ordersServiceMock: { advanceStatuses: Mock };
}

const Arrange = {
  async setup(spies: Spies, env: Record<string, string> = {}) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderStatusTimer,
        { provide: OrdersService, useValue: spies.ordersServiceMock },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
      ],
    }).compile();

    return moduleRef.get(OrderStatusTimer);
  },

  createSpies(): Spies {
    return {
      ordersServiceMock: { advanceStatuses: vi.fn().mockResolvedValue(0) },
    };
  },
};
