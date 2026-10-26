export const ConnectionTone = {
  Ok: 'ok',
  Warning: 'warning',
  Error: 'error',
} as const;

export type ConnectionTone =
  (typeof ConnectionTone)[keyof typeof ConnectionTone];
