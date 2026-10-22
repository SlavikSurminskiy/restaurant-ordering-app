import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { DiscountService } from './discount.service';

describe('DiscountService', () => {
  it('should return the discount from ORDER_DISCOUNT', async () => {
    const { configMock } = Arrange.createSpies({ ORDER_DISCOUNT: '500' });
    const service = await Arrange.setup({ configMock });

    expect(service.getDiscount()).toEqual({ discount: 500 });
    expect(configMock.get).toHaveBeenCalledWith('ORDER_DISCOUNT', '0');
  });

  it('should default the discount to 0', async () => {
    const { configMock } = Arrange.createSpies({});
    const service = await Arrange.setup({ configMock });

    expect(service.getDiscount()).toEqual({ discount: 0 });
  });

  it.each(['-100', '12.5', 'abc', '1e3', '', ' 500'])(
    'should reject ORDER_DISCOUNT=%s on startup',
    async (value) => {
      const { configMock } = Arrange.createSpies({ ORDER_DISCOUNT: value });

      await expect(Arrange.setup({ configMock })).rejects.toThrow(
        'ORDER_DISCOUNT',
      );
    },
  );
});

interface Spies {
  configMock: { get: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscountService,
        { provide: ConfigService, useValue: spies.configMock },
      ],
    }).compile();

    return moduleRef.get(DiscountService);
  },

  createSpies(env: Record<string, string>) {
    const configMock = {
      get: vi.fn((key: string, fallback?: string) => env[key] ?? fallback),
    };

    return {
      configMock,
    };
  },
};
