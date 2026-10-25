import { Injectable, Logger } from '@nestjs/common';
import { filter, Observable } from 'rxjs';

import {
  UserRole,
  ServerEvent,
  MenuEventType,
  OrderEventType,
} from '@restaurant/shared-api-types';

import { RequestUser } from '../auth/auth.models';

import { EventBus } from './event-bus/event-bus';

@Injectable()
export class EventsService {
  readonly #logger = new Logger(EventsService.name);

  constructor(private readonly bus: EventBus) {}

  eventsFor(user: RequestUser | null): Observable<ServerEvent> {
    return this.bus.events$.pipe(
      filter((event) => this.#canReceive(event, user)),
    );
  }

  #canReceive(event: ServerEvent, user: RequestUser | null) {
    switch (event.type) {
      case MenuEventType.CategoryUpserted:
      case MenuEventType.CategoryDeleted:
      case MenuEventType.DishUpserted:
      case MenuEventType.DishDeleted:
        return true;
      case OrderEventType.Created:
      case OrderEventType.Updated:
        return (
          user !== null &&
          (user.role === UserRole.Admin || event.order.userId === user.id)
        );
      default: {
        const unhandled: never = event;

        this.#logger.warn(
          `Dropped an event of unknown type: ${JSON.stringify(unhandled)}`,
        );

        return false;
      }
    }
  }
}
