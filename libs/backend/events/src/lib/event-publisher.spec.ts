import {
  HttpClient,
  HttpNetworkError,
  HttpResponseError,
} from '@nestjs/http-client';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import {
  INTERNAL_EVENTS_PATH,
  MenuEventType,
  ServerEvent,
} from '@restaurant/shared-api-types';

import { EventPublisher } from './event-publisher';

describe(EventPublisher.name, () => {
  it('should POST the event as JSON to the internal events path', async () => {
    const spies = Arrange.createSpies();
    const publisher = await Arrange.setup(spies);
    const event = Arrange.createEvent();

    await publisher.publish(event);

    expect(spies.httpClientMock.post).toHaveBeenCalledWith(
      INTERNAL_EVENTS_PATH,
      { json: event },
    );
  });

  it('should not throw when the receiver answers with an error', async () => {
    const spies = Arrange.createSpies();
    spies.httpClientMock.post.mockRejectedValue(
      new HttpResponseError({
        method: 'POST',
        url: Arrange.url,
        status: 500,
      }),
    );
    const publisher = await Arrange.setup(spies);

    await expect(
      publisher.publish(Arrange.createEvent()),
    ).resolves.toBeUndefined();
  });

  it('should not throw when the receiver is unreachable', async () => {
    const spies = Arrange.createSpies();
    spies.httpClientMock.post.mockRejectedValue(
      new HttpNetworkError({
        method: 'POST',
        url: Arrange.url,
        cause: new Error('ECONNREFUSED'),
      }),
    );
    const publisher = await Arrange.setup(spies);

    await expect(
      publisher.publish(Arrange.createEvent()),
    ).resolves.toBeUndefined();
  });
});

interface Spies {
  httpClientMock: { post: Mock };
}

const Arrange = {
  url: 'http://backend:3000/internal/events',

  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventPublisher,
        { provide: HttpClient, useValue: spies.httpClientMock },
      ],
    }).compile();

    return moduleRef.get(EventPublisher);
  },

  createSpies(): Spies {
    return {
      httpClientMock: {
        post: vi.fn().mockResolvedValue({ status: 204, data: undefined }),
      },
    };
  },

  createEvent(): ServerEvent {
    return { type: MenuEventType.DishDeleted, dishId: 'd-1' };
  },
};
