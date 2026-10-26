import type { Observable } from 'rxjs';

import type { ServerEvent } from '@restaurant/shared-api-types';

import { SnapshotSyncUpdateKind } from './snapshot-sync.enums';

export interface SnapshotSyncOptions<Snapshot, Event extends ServerEvent> {
  loadSnapshot: () => Observable<Snapshot>;
  /** Picks the events this snapshot cares about out of the shared stream. */
  isEvent: (event: ServerEvent) => event is Event;
  /** Extra moments to load a fresh snapshot, e.g. after the server said it is out of date. */
  reload$?: Observable<unknown>;
}

export type SnapshotSyncUpdate<Snapshot, Event extends ServerEvent> =
  | { kind: typeof SnapshotSyncUpdateKind.Snapshot; snapshot: Snapshot }
  | { kind: typeof SnapshotSyncUpdateKind.SnapshotFailed; error: unknown }
  | { kind: typeof SnapshotSyncUpdateKind.Event; event: Event };
