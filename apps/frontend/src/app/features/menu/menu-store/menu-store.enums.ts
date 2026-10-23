export const LoadStatus = {
  Idle: 'idle',
  Loading: 'loading',
  Loaded: 'loaded',
  Error: 'error',
} as const;

export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus];
