import { Service, signal } from '@angular/core';
import {
  map,
  tap,
  defer,
  filter,
  share,
  Subject,
  finalize,
  startWith,
  switchMap,
  Observable,
} from 'rxjs';

import type { ServerEvent } from '@restaurant/shared-api-types';
import { retryWithBackoff } from '@restaurant/frontend/core/utils';

import {
  SseMessage,
  SseMessageKind,
  SseStreamStatus,
} from './sse-data-access.models';

export const EVENTS_URL = '/api/events';

type SseEventMessage = Extract<
  SseMessage,
  { kind: typeof SseMessageKind.Event }
>;

@Service()
export class SseDataAccessService {
  readonly #reconnects = new Subject<void>();

  readonly #status = signal<SseStreamStatus>(SseStreamStatus.Disconnected);
  readonly status = this.#status.asReadonly();

  /**
   * One connection for all subscribers: the first subscriber opens it, the
   * last one to leave closes it. The status is tracked here, before `share`,
   * so it is counted once however many subscribers there are.
   */
  readonly #messages$: Observable<SseMessage> = this.#reconnects.pipe(
    startWith(undefined),
    switchMap(() => this.#stream()),
    tap((message) =>
      this.#status.update((status) => this.#nextStatus(status, message.kind)),
    ),
    finalize(() => this.#status.set(SseStreamStatus.Disconnected)),
    share(),
  );

  fromEventSource(): Observable<SseMessage> {
    return this.#messages$;
  }

  /** The server events of the same shared connection, without the open/error messages. */
  serverEvents(): Observable<ServerEvent> {
    return this.#messages$.pipe(
      filter(
        (message): message is SseEventMessage =>
          message.kind === SseMessageKind.Event,
      ),
      map(({ event }) => event),
    );
  }

  reconnect(): void {
    this.#reconnects.next();
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
    return defer(() => {
      this.#status.set(SseStreamStatus.Connecting);

      return this.#eventSource().pipe(
        retryWithBackoff({
          resetOn: ({ kind }) => kind === SseMessageKind.Open,
        }),
      );
    });
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
