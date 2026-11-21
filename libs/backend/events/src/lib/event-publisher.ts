import { Injectable, Logger } from '@nestjs/common';
import { HttpClient } from '@nestjs/http-client';

import {
  INTERNAL_EVENTS_PATH,
  ServerEvent,
} from '@restaurant/shared-api-types';

/**
 * Sends events to the realtime gateway, which streams them to browsers; the base URL and the
 * timeout come from `EventPublisherModule`. A failed send is logged and not thrown: the change is
 * already committed, and clients reload their snapshot when their stream reconnects.
 */
@Injectable()
export class EventPublisher {
  readonly #logger = new Logger(EventPublisher.name);

  constructor(private readonly http: HttpClient) {}

  async publish(event: ServerEvent): Promise<void> {
    try {
      await this.http.post(INTERNAL_EVENTS_PATH, { json: event });
    } catch (error) {
      this.#logger.warn(`${event.type} not delivered: ${String(error)}`);
    }
  }
}
