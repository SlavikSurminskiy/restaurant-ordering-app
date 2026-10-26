import { inject, Service } from '@angular/core';
import {
  of,
  map,
  take,
  timer,
  merge,
  buffer,
  concat,
  EMPTY,
  filter,
  mergeAll,
  takeUntil,
  skipUntil,
  switchMap,
  throwError,
  Observable,
  shareReplay,
  catchError,
} from 'rxjs';

import type { ServerEvent } from '@restaurant/shared-api-types';

import { SseService } from '../sse.service';
import { retryWithBackoff } from '../utils/retry-with-backoff';

import { SNAPSHOT_FALLBACK_DELAY_MS } from './snapshot-sync.constants';
import { SnapshotSyncUpdateKind } from './snapshot-sync.enums';
import {
  SnapshotSyncOptions,
  SnapshotSyncUpdate,
} from './snapshot-sync.models';

@Service()
export class SnapshotSyncService {
  readonly #sseService = inject(SseService);

  sync<Snapshot, Event extends ServerEvent>(
    options: SnapshotSyncOptions<Snapshot, Event>,
  ): Observable<SnapshotSyncUpdate<Snapshot, Event>> {
    return this.#snapshotTriggers(options.reload$ ?? EMPTY).pipe(
      switchMap(() => this.#snapshotThenEvents(options)),
    );
  }

  #snapshotTriggers(reload$: Observable<unknown>): Observable<unknown> {
    const opened$ = this.#sseService.opened$;

    // If opened$ doesn't emit within the delay (e.g. proxy block).
    // Waits for SNAPSHOT_FALLBACK_DELAY_MS and triggers the fallback if opened$ hasn't fired yet.
    return merge(
      opened$,
      timer(SNAPSHOT_FALLBACK_DELAY_MS).pipe(takeUntil(opened$)),
      reload$,
    );
  }

  #snapshotThenEvents<Snapshot, Event extends ServerEvent>({
    loadSnapshot,
    isEvent,
  }: SnapshotSyncOptions<Snapshot, Event>): Observable<
    SnapshotSyncUpdate<Snapshot, Event>
  > {
    type Update = SnapshotSyncUpdate<Snapshot, Event>;

    const snapshot$ = loadSnapshot().pipe(
      map((snapshot): Update => ({
        kind: SnapshotSyncUpdateKind.Snapshot,
        snapshot,
      })),
      catchError((error: unknown) =>
        concat(
          of<Update>({ kind: SnapshotSyncUpdateKind.SnapshotFailed, error }),
          throwError(() => error),
        ),
      ),
      retryWithBackoff(),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    const isSnapshotLoaded$ = snapshot$.pipe(
      filter(({ kind }) => kind === SnapshotSyncUpdateKind.Snapshot),
    );

    const toUpdate = (event: Event): Update => ({
      kind: SnapshotSyncUpdateKind.Event,
      event,
    });

    const events$ = this.#sseService.events$.pipe(filter(isEvent));

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
