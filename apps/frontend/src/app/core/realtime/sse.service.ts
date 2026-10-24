import { DestroyRef, inject, Service, signal } from '@angular/core';
import {
  map,
  defer,
  filter,
  Subject,
  Observable,
  startWith,
  Subscription,
} from 'rxjs';

import type { ServerEvent } from '@restaurant/shared-api-types';

import { SseMessage, SseMessageKind, SseStreamStatus } from './sse.models';
import { retryWithBackoff } from './utils/retry-with-backoff';

export const EVENTS_URL = '/api/events';

type SseEventMessage = Extract<
  SseMessage,
  { kind: typeof SseMessageKind.Event }
>;

@Service()
export class SseService {
  readonly #messages = new Subject<SseMessage>();

  readonly #opens$ = this.#messages.pipe(
    filter(({ kind }) => kind === SseMessageKind.Open),
    map((): void => undefined),
  );

  /**
   * Fires on every (re)connect: events sent while disconnected are lost, so
   * subscribers reload their snapshot on it. A subscriber that joins while the
   * stream is already open gets it right away.
   */
  readonly opened$: Observable<void> = defer(() =>
    this.#status() === SseStreamStatus.Online
      ? this.#opens$.pipe(startWith(undefined))
      : this.#opens$,
  );

  readonly events$: Observable<ServerEvent> = this.#messages.pipe(
    filter(
      (message): message is SseEventMessage =>
        message.kind === SseMessageKind.Event,
    ),
    map(({ event }) => event),
  );

  readonly #status = signal<SseStreamStatus>(SseStreamStatus.Disconnected);
  readonly status = this.#status.asReadonly();

  #connection: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  connect(): void {
    if (this.#connection) {
      return;
    }

    this.#status.set(SseStreamStatus.Connecting);

    this.#connection = this.#stream().subscribe((message) => {
      this.#status.update((status) => this.#nextStatus(status, message.kind));
      this.#messages.next(message);
    });
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  disconnect(): void {
    this.#connection?.unsubscribe();
    this.#connection = null;
    this.#status.set(SseStreamStatus.Disconnected);
  }

  #nextStatus(current: SseStreamStatus, kind: SseMessageKind): SseStreamStatus {
    if (kind === SseMessageKind.Open) {
      return SseStreamStatus.Online;
    }

    if (kind === SseMessageKind.Error && current === SseStreamStatus.Online) {
      return SseStreamStatus.Reconnecting;
    }

    return current;
  }

  #stream(): Observable<SseMessage> {
    return this.#eventSource().pipe(
      retryWithBackoff({ resetOn: ({ kind }) => kind === SseMessageKind.Open }),
    );
  }

  #eventSource(): Observable<SseMessage> {
    return new Observable<SseMessage>((subscriber) => {
      const source = new EventSource(EVENTS_URL);

      source.onopen = () => subscriber.next({ kind: SseMessageKind.Open });

      source.onmessage = ({ data }: MessageEvent<string>) =>
        subscriber.next({
          kind: SseMessageKind.Event,
          event: JSON.parse(data) as ServerEvent,
        });

      source.onerror = () => {
        subscriber.next({ kind: SseMessageKind.Error });

        // CONNECTING: the browser reconnects by itself. CLOSED: it gave up
        // (e.g. the dev proxy answered 502), so `retry` opens a new one.
        if (source.readyState === EventSource.CLOSED) {
          subscriber.error(new Error('Event stream closed'));
        }
      };

      return () => source.close();
    });
  }
}
