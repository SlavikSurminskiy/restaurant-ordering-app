import { vi } from 'vitest';
import { MessageEvent } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DishDeletedEvent, MenuEventType } from '@restaurant/shared-api-types';

import { EventBus } from './event-bus/event-bus';
import { EventsController, HEARTBEAT_INTERVAL_MS } from './events.controller';

describe(EventsController.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should send published events as message data', async () => {
    const { controller, bus } = await Arrange.setup();
    const received: MessageEvent[] = [];
    controller.stream().subscribe((message) => received.push(message));
    const event = Arrange.createDishDeletedEvent();

    bus.publish(event);

    expect(received).toEqual([{ data: event }]);
  });

  it('should send a heartbeat comment every interval', async () => {
    const { controller } = await Arrange.setup();
    const received: MessageEvent[] = [];
    controller.stream().subscribe((message) => received.push(message));

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS - 1);
    expect(received).toEqual([]);

    vi.advanceTimersByTime(1 + HEARTBEAT_INTERVAL_MS);
    expect(received).toEqual([
      { comment: 'heartbeat' },
      { comment: 'heartbeat' },
    ]);
  });

  it('should complete and stop heartbeats when the bus completes', async () => {
    const { controller, bus } = await Arrange.setup();
    const received: MessageEvent[] = [];
    let completed = false;
    controller.stream().subscribe({
      next: (message) => received.push(message),
      complete: () => (completed = true),
    });

    bus.onModuleDestroy();
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

    expect(completed).toBe(true);
    expect(received).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should stop the heartbeat when the client disconnects', async () => {
    const { controller } = await Arrange.setup();
    const subscription = controller.stream().subscribe();

    subscription.unsubscribe();

    expect(vi.getTimerCount()).toBe(0);
  });
});

const Arrange = {
  async setup() {
    const moduleRef = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [EventBus],
    }).compile();

    return {
      controller: moduleRef.get(EventsController),
      bus: moduleRef.get(EventBus),
    };
  },

  createDishDeletedEvent(): DishDeletedEvent {
    return {
      type: MenuEventType.DishDeleted,
      dishId: '7d2f1c84-1e7b-4a59-8c39-2b6e9f0d4a21',
    };
  },
};
