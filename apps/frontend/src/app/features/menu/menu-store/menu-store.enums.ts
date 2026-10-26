export const LoadStatus = {
  Loading: 'loading',
  Loaded: 'loaded',
  Error: 'error',
} as const;

export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus];
