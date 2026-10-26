export const LiveResourceUpdateKind = {
  Snapshot: 'snapshot',
  SnapshotFailed: 'snapshot-failed',
  Event: 'event',
} as const;

export type LiveResourceUpdateKind =
  (typeof LiveResourceUpdateKind)[keyof typeof LiveResourceUpdateKind];
