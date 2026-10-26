import type { Observable } from 'rxjs';

import { LiveResourceUpdateKind } from './live-resource-factory.enums';

export interface LiveResourceOptions<Snapshot, Event> {
  loadSnapshot: () => Observable<Snapshot>;
  events$: Observable<Event>;
  reload$?: Observable<unknown>;
}

export type LiveResourceUpdate<Snapshot, Event> =
  | { kind: typeof LiveResourceUpdateKind.Snapshot; snapshot: Snapshot }
  | { kind: typeof LiveResourceUpdateKind.SnapshotFailed; error: unknown }
  | { kind: typeof LiveResourceUpdateKind.Event; event: Event };
