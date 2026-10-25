import { Test } from '@nestjs/testing';

import {
  UserRole,
  ServerEvent,
  OrderStatus,
  MenuEventType,
  OrderEventType,
} from '@restaurant/shared-api-types';

import { RequestUser } from '../auth/auth.models';

import { EventBus } from './event-bus/event-bus';
import { EventsService } from './events.service';

describe(EventsService.name, () => {
  it('should send menu events to guests', async () => {
    const { service, bus } = await Arrange.setup();
    const received: ServerEvent[] = [];
    service.eventsFor(null).subscribe((event) => received.push(event));
    const event = Arrange.createMenuEvent();

    bus.publish(event);

    expect(received).toEqual([event]);
  });

  it('should not send order events to guests', async () => {
    const { service, bus } = await Arrange.setup();
    const received: ServerEvent[] = [];
    service.eventsFor(null).subscribe((event) => received.push(event));

    bus.publish(Arrange.createOrderEvent('u-owner'));

    expect(received).toEqual([]);
  });

  it('should send an order event to the order owner', async () => {
    const { service, bus } = await Arrange.setup();
    const received: ServerEvent[] = [];
    service
      .eventsFor(Arrange.createUser('u-owner', UserRole.Customer))
      .subscribe((event) => received.push(event));
    const event = Arrange.createOrderEvent('u-owner');

    bus.publish(event);

    expect(received).toEqual([event]);
  });

  it('should not send an order event to another customer', async () => {
    const { service, bus } = await Arrange.setup();
    const received: ServerEvent[] = [];
    service
      .eventsFor(Arrange.createUser('u-other', UserRole.Customer))
      .subscribe((event) => received.push(event));

    bus.publish(Arrange.createOrderEvent('u-owner'));

    expect(received).toEqual([]);
  });

  it('should send every order event to admins', async () => {
    const { service, bus } = await Arrange.setup();
    const received: ServerEvent[] = [];
    service
      .eventsFor(Arrange.createUser('u-admin', UserRole.Admin))
      .subscribe((event) => received.push(event));
    const event = Arrange.createOrderEvent('u-owner');

    bus.publish(event);

    expect(received).toEqual([event]);
  });

  it('should drop an event of an unknown type', async () => {
    const { service, bus } = await Arrange.setup();
    const received: ServerEvent[] = [];
    service
      .eventsFor(Arrange.createUser('u-admin', UserRole.Admin))
      .subscribe((event) => received.push(event));

    bus.publish({ type: 'unknown' } as unknown as ServerEvent);

    expect(received).toEqual([]);
  });

  it('should complete when the bus completes', async () => {
    const { service, bus } = await Arrange.setup();
    let completed = false;
    service.eventsFor(null).subscribe({ complete: () => (completed = true) });

    bus.onModuleDestroy();

    expect(completed).toBe(true);
  });
});

const Arrange = {
  async setup() {
    const moduleRef = await Test.createTestingModule({
      providers: [EventsService, EventBus],
    }).compile();

    return {
      service: moduleRef.get(EventsService),
      bus: moduleRef.get(EventBus),
    };
  },

  createUser(id: string, role: UserRole): RequestUser {
    return { id, role };
  },

  createMenuEvent(): ServerEvent {
    return { type: MenuEventType.DishDeleted, dishId: 'd-caesar' };
  },

  createOrderEvent(userId: string): ServerEvent {
    return {
      type: OrderEventType.Created,
      order: {
        id: 'o-1',
        userId,
        userName: 'Customer',
        status: OrderStatus.New,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        createdAt: '2026-10-25T10:00:00.000Z',
        updatedAt: '2026-10-25T10:00:00.000Z',
      },
    };
  },
};
