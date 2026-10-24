export const LoadStatus = {
  Loading: 'loading',
  Loaded: 'loaded',
  Error: 'error',
} as const;

export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus];

export const MenuUpdateKind = {
  Snapshot: 'snapshot',
  SnapshotFailed: 'snapshot-failed',
  Event: 'event',
} as const;

export type MenuUpdateKind =
  (typeof MenuUpdateKind)[keyof typeof MenuUpdateKind];
