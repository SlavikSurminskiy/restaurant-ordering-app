import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import {
  INTERNAL_EVENTS_PATH,
  ServerEvent,
} from '@restaurant/shared-api-types';

import { EventBus } from './event-bus/event-bus';

/**
 * Events from other services (menu-service) into the in-memory bus that feeds SSE.
 * Not routed from outside; trusted like every request body here.
 */
@Controller()
export class InternalEventsController {
  constructor(private readonly eventBus: EventBus) {}

  @Post(INTERNAL_EVENTS_PATH)
  @HttpCode(HttpStatus.NO_CONTENT)
  receive(@Body() event: ServerEvent): void {
    this.eventBus.publish(event);
  }
}
