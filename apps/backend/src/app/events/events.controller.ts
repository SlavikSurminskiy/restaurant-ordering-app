import { Controller, MessageEvent, Req, Sse } from '@nestjs/common';
import type { Request } from 'express';
import {
  endWith,
  ignoreElements,
  interval,
  map,
  merge,
  Observable,
  takeUntil,
} from 'rxjs';

import { AuthCookieService } from '../auth/utils/auth-cookie.service';

import { EventsService } from './events.service';

/** Keeps idle connections open through proxies that drop silent streams. */
export const HEARTBEAT_INTERVAL_MS = 20_000;

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly authCookie: AuthCookieService,
  ) {}

  /** The user is read once on connect; clients reconnect after login and logout. */
  @Sse()
  async stream(@Req() request: Request): Promise<Observable<MessageEvent>> {
    const user = await this.authCookie.extractUserFromCookie(request);

    const serverEvents$ = this.eventsService.eventsFor(user);

    const events$ = serverEvents$.pipe(map((data): MessageEvent => ({ data })));

    const busClosed$ = serverEvents$.pipe(ignoreElements(), endWith(null));

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ comment: 'heartbeat' })),
      takeUntil(busClosed$),
    );

    return merge(events$, heartbeat$);
  }
}
