import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { MessageEvent } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { Subject } from 'rxjs';

import {
  UserRole,
  ServerEvent,
  MenuEventType,
  DishDeletedEvent,
} from '@restaurant/shared-api-types';

import { AuthCookieService } from '../auth/utils/auth-cookie.service';

import { EventsController, HEARTBEAT_INTERVAL_MS } from './events.controller';
import { EventsService } from './events.service';

describe(EventsController.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should send the events of the user as message data', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);
    const received: MessageEvent[] = [];
    (await controller.stream(Arrange.createRequest())).subscribe((message) =>
      received.push(message),
    );
    const event = Arrange.createDishDeletedEvent();

    spies.events.next(event);

    expect(received).toEqual([{ data: event }]);
  });

  it('should ask for the events of a guest', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);
    const request = Arrange.createRequest();

    await controller.stream(request);

    expect(
      spies.authCookieServiceMock.extractUserFromCookie,
    ).toHaveBeenCalledWith(request);
    expect(spies.eventsServiceMock.eventsFor).toHaveBeenCalledWith(null);
  });

  it('should ask for the events of the signed-in user', async () => {
    const spies = Arrange.createSpies();
    spies.authCookieServiceMock.extractUserFromCookie.mockResolvedValue({
      id: 'u-owner',
      role: UserRole.Customer,
    });
    const controller = await Arrange.setup(spies);

    await controller.stream(Arrange.createRequest());

    expect(spies.eventsServiceMock.eventsFor).toHaveBeenCalledWith({
      id: 'u-owner',
      role: UserRole.Customer,
    });
  });

  it('should send a heartbeat comment every interval', async () => {
    const controller = await Arrange.setup();
    const received: MessageEvent[] = [];
    (await controller.stream(Arrange.createRequest())).subscribe((message) =>
      received.push(message),
    );

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS - 1);
    expect(received).toEqual([]);

    vi.advanceTimersByTime(1 + HEARTBEAT_INTERVAL_MS);
    expect(received).toEqual([
      { comment: 'heartbeat' },
      { comment: 'heartbeat' },
    ]);
  });

  it('should complete and stop heartbeats when the events complete', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);
    const received: MessageEvent[] = [];
    let completed = false;
    (await controller.stream(Arrange.createRequest())).subscribe({
      next: (message) => received.push(message),
      complete: () => (completed = true),
    });

    spies.events.complete();
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

    expect(completed).toBe(true);
    expect(received).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should stop the heartbeat when the client disconnects', async () => {
    const controller = await Arrange.setup();
    const subscription = (
      await controller.stream(Arrange.createRequest())
    ).subscribe();

    subscription.unsubscribe();

    expect(vi.getTimerCount()).toBe(0);
  });
});

interface Spies {
  events: Subject<ServerEvent>;
  eventsServiceMock: { eventsFor: Mock };
  authCookieServiceMock: { extractUserFromCookie: Mock };
}

const Arrange = {
  async setup(spies?: Spies) {
    const defaults = Arrange.createSpies();
    const moduleRef = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: spies?.eventsServiceMock ?? defaults.eventsServiceMock,
        },
        {
          provide: AuthCookieService,
          useValue:
            spies?.authCookieServiceMock ?? defaults.authCookieServiceMock,
        },
      ],
    }).compile();

    return moduleRef.get(EventsController);
  },

  createSpies(): Spies {
    const events = new Subject<ServerEvent>();

    return {
      events,
      eventsServiceMock: { eventsFor: vi.fn(() => events.asObservable()) },
      authCookieServiceMock: {
        extractUserFromCookie: vi.fn().mockResolvedValue(null),
      },
    };
  },

  createRequest(): Request {
    return { cookies: {} } as Request;
  },

  createDishDeletedEvent(): DishDeletedEvent {
    return {
      type: MenuEventType.DishDeleted,
      dishId: '7d2f1c84-1e7b-4a59-8c39-2b6e9f0d4a21',
    };
  },
};
