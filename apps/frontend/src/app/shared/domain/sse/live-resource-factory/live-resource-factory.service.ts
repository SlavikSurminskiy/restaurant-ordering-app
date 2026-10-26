import { inject, Service } from '@angular/core';
import {
  of,
  map,
  take,
  defer,
  timer,
  merge,
  buffer,
  concat,
  EMPTY,
  filter,
  mergeAll,
  startWith,
  takeUntil,
  skipUntil,
  switchMap,
  throwError,
  Observable,
  shareReplay,
  catchError,
} from 'rxjs';

import {
  SseMessageKind,
  SseStreamStatus,
  SseDataAccessService,
} from '@restaurant/frontend/data-access/sse';
import { retryWithBackoff } from '@restaurant/frontend/core/utils';

import { SNAPSHOT_FALLBACK_DELAY_MS } from './live-resource-factory.constants';
import { LiveResourceUpdateKind } from './live-resource-factory.enums';
import {
  LiveResourceOptions,
  LiveResourceUpdate,
} from './live-resource-factory.models';

/**
 * Keeps a snapshot loaded over HTTP in line with the event stream: a fresh
 * snapshot on every (re)connect, and the events of each load applied on top.
 * Subscribing also keeps the shared event stream open.
 */
@Service()
export class LiveResourceFactoryService {
  readonly #sseDataAccess = inject(SseDataAccessService);

  create<Snapshot, Event>(
    options: LiveResourceOptions<Snapshot, Event>,
  ): Observable<LiveResourceUpdate<Snapshot, Event>> {
    return this.#snapshotTriggers(options.reload$ ?? EMPTY).pipe(
      switchMap(() => this.#streamSnapshotThenEvents(options)),
    );
  }

  #snapshotTriggers(reload$: Observable<unknown>): Observable<unknown> {
    const opened$ = this.#opened();

    // If opened$ doesn't emit within the delay (e.g. proxy block).
    // Waits for SNAPSHOT_FALLBACK_DELAY_MS and triggers the fallback if opened$ hasn't fired yet.
    return merge(
      opened$,
      timer(SNAPSHOT_FALLBACK_DELAY_MS).pipe(takeUntil(opened$)),
      reload$,
    );
  }

  /**
   * Fires on every (re)connect: events sent while disconnected are lost. A
   * resource that joins a stream that is already open gets it right away.
   */
  #opened(): Observable<void> {
    const opens$ = this.#sseDataAccess.fromEventSource().pipe(
      filter(({ kind }) => kind === SseMessageKind.Open),
      map((): void => undefined),
    );

    return defer(() =>
      this.#sseDataAccess.status() === SseStreamStatus.Online
        ? opens$.pipe(startWith(undefined))
        : opens$,
    );
  }

  #streamSnapshotThenEvents<Snapshot, Event>({
    loadSnapshot,
    events$,
  }: LiveResourceOptions<Snapshot, Event>): Observable<
    LiveResourceUpdate<Snapshot, Event>
  > {
    type Update = LiveResourceUpdate<Snapshot, Event>;

    const snapshot$ = loadSnapshot().pipe(
      map((snapshot): Update => ({
        kind: LiveResourceUpdateKind.Snapshot,
        snapshot,
      })),
      catchError((error: unknown) =>
        concat(
          of<Update>({ kind: LiveResourceUpdateKind.SnapshotFailed, error }),
          throwError(() => error),
        ),
      ),
      retryWithBackoff(),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    const isSnapshotLoaded$ = snapshot$.pipe(
      filter(({ kind }) => kind === LiveResourceUpdateKind.Snapshot),
    );

    const toUpdate = (event: Event): Update => ({
      kind: LiveResourceUpdateKind.Event,
      event,
    });

    const bufferedEvents$ = events$.pipe(
      buffer(isSnapshotLoaded$),
      take(1),
      mergeAll(),
      map(toUpdate),
    );

    const liveEvents$ = events$.pipe(
      skipUntil(isSnapshotLoaded$),
      map(toUpdate),
    );

    return merge(snapshot$, bufferedEvents$, liveEvents$);
  }
}
