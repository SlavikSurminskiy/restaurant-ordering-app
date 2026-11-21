import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { MenuEventType, ServerEvent } from '@restaurant/shared-api-types';

import { EventBus } from './event-bus/event-bus';
import { InternalEventsController } from './internal-events.controller';

describe(InternalEventsController.name, () => {
  it('should publish the received event to the bus', async () => {
    const spies = Arrange.createSpies();
    const controller = await Arrange.setup(spies);
    const event: ServerEvent = {
      type: MenuEventType.DishDeleted,
      dishId: 'd-1',
    };

    controller.receive(event);

    expect(spies.eventBusMock.publish).toHaveBeenCalledWith(event);
  });
});

interface Spies {
  eventBusMock: { publish: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      controllers: [InternalEventsController],
      providers: [{ provide: EventBus, useValue: spies.eventBusMock }],
    }).compile();

    return moduleRef.get(InternalEventsController);
  },

  createSpies(): Spies {
    return { eventBusMock: { publish: vi.fn() } };
  },
};
