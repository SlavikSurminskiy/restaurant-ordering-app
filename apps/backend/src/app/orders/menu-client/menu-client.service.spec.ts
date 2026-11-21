import { ServiceUnavailableException } from '@nestjs/common';
import {
  HttpClient,
  HttpResponseError,
  HttpTimeoutError,
} from '@nestjs/http-client';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import {
  INTERNAL_ORDER_PRICING_PATH,
  OrderPricingResponse,
} from '@restaurant/shared-api-types';

import { MenuClient } from './menu-client.service';

describe(MenuClient.name, () => {
  it('should POST the dish ids as JSON to the order pricing path', async () => {
    const spies = Arrange.createSpies();
    const client = await Arrange.setup(spies);

    await client.getPricing({ dishIds: ['d-1'] });

    expect(spies.httpClientMock.post).toHaveBeenCalledWith(
      INTERNAL_ORDER_PRICING_PATH,
      { json: { dishIds: ['d-1'] } },
    );
  });

  it('should return the pricing from the menu', async () => {
    const pricing = Arrange.createPricing();
    const spies = Arrange.createSpies();
    spies.httpClientMock.post.mockResolvedValue({ data: pricing });
    const client = await Arrange.setup(spies);

    await expect(client.getPricing({ dishIds: ['d-1'] })).resolves.toEqual(
      pricing,
    );
  });

  it('should answer 503 when the menu answers with an error', async () => {
    const spies = Arrange.createSpies();
    spies.httpClientMock.post.mockRejectedValue(
      new HttpResponseError({ method: 'POST', url: Arrange.url, status: 500 }),
    );
    const client = await Arrange.setup(spies);

    await expect(
      client.getPricing({ dishIds: ['d-1'] }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('should answer 503 when the menu does not answer in time', async () => {
    const spies = Arrange.createSpies();
    spies.httpClientMock.post.mockRejectedValue(
      new HttpTimeoutError({
        method: 'POST',
        url: Arrange.url,
        timeoutMs: 3000,
      }),
    );
    const client = await Arrange.setup(spies);

    await expect(
      client.getPricing({ dishIds: ['d-1'] }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

interface Spies {
  httpClientMock: { post: Mock };
}

const Arrange = {
  url: 'http://menu-service:3002/internal/order-pricing',

  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MenuClient,
        { provide: HttpClient, useValue: spies.httpClientMock },
      ],
    }).compile();

    return moduleRef.get(MenuClient);
  },

  createSpies(): Spies {
    return {
      httpClientMock: {
        post: vi.fn().mockResolvedValue({ data: Arrange.createPricing() }),
      },
    };
  },

  createPricing(): OrderPricingResponse {
    return {
      dishes: [
        {
          id: 'd-1',
          name: 'Soup',
          price: 800,
          isOpenPrice: false,
          available: true,
        },
      ],
      discount: 500,
    };
  },
};
