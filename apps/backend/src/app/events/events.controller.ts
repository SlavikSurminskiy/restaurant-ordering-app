import { Controller, MessageEvent, Sse } from '@nestjs/common';
import {
  endWith,
  ignoreElements,
  interval,
  map,
  merge,
  Observable,
  takeUntil,
} from 'rxjs';

import { EventBus } from './event-bus/event-bus';

/** Keeps idle connections open through proxies that drop silent streams. */
export const HEARTBEAT_INTERVAL_MS = 20_000;

@Controller('events')
export class EventsController {
  constructor(private readonly bus: EventBus) {}

  @Sse()
  stream(): Observable<MessageEvent> {
    const events$ = this.bus.events$.pipe(
      map((data): MessageEvent => ({ data })),
    );

    const busClosed$ = this.bus.events$.pipe(ignoreElements(), endWith(null));

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ comment: 'heartbeat' })),
      takeUntil(busClosed$),
    );

    return merge(events$, heartbeat$);
  }
}
