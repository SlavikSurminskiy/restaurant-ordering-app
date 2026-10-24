import { SseStreamStatus } from '../sse.models';

export const SseConnectionStatus = {
  ...SseStreamStatus,
  Offline: 'offline',
} as const;

export type SseConnectionStatus =
  (typeof SseConnectionStatus)[keyof typeof SseConnectionStatus];
