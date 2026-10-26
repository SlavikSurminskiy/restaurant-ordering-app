import { SseStreamStatus } from '@restaurant/frontend/data-access/sse';

export const SseConnectionStatus = {
  ...SseStreamStatus,
  Offline: 'offline',
} as const;

export type SseConnectionStatus =
  (typeof SseConnectionStatus)[keyof typeof SseConnectionStatus];
