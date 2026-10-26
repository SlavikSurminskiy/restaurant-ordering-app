export const SnapshotSyncUpdateKind = {
  Snapshot: 'snapshot',
  SnapshotFailed: 'snapshot-failed',
  Event: 'event',
} as const;

export type SnapshotSyncUpdateKind =
  (typeof SnapshotSyncUpdateKind)[keyof typeof SnapshotSyncUpdateKind];
