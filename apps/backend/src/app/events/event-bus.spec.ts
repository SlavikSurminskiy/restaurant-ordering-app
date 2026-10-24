import { Test } from '@nestjs/testing';

import {
  ServerEvent,
  MenuEventType,
  DishDeletedEvent,
} from '@restaurant/shared-api-types';

import { EventBus } from './event-bus';

describe(EventBus.name, () => {
  it('should deliver published events to subscribers', async () => {
    const bus = await Arrange.setup();
    const received: ServerEvent[] = [];
    bus.events$.subscribe((event) => received.push(event));
    const event = Arrange.createDishDeletedEvent();

    bus.publish(event);

    expect(received).toEqual([event]);
  });

  it('should not replay events published before subscribing', async () => {
    const bus = await Arrange.setup();
    bus.publish(Arrange.createDishDeletedEvent());
    const received: ServerEvent[] = [];

    bus.events$.subscribe((event) => received.push(event));

    expect(received).toEqual([]);
  });

  it('should complete the stream on module destroy', async () => {
    const bus = await Arrange.setup();
    let completed = false;
    bus.events$.subscribe({ complete: () => (completed = true) });

    bus.onModuleDestroy();

    expect(completed).toBe(true);
  });
});

const Arrange = {
  async setup() {
    const moduleRef = await Test.createTestingModule({
      providers: [EventBus],
    }).compile();

    return moduleRef.get(EventBus);
  },

  createDishDeletedEvent(): DishDeletedEvent {
    return {
      type: MenuEventType.DishDeleted,
      dishId: '7d2f1c84-1e7b-4a59-8c39-2b6e9f0d4a21',
    };
  },
};
