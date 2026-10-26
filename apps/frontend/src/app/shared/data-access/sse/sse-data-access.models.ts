import type { ServerEvent } from '@restaurant/shared-api-types';

export const SseMessageKind = {
  Open: 'open',
  Event: 'event',
  Error: 'error',
} as const;

export type SseMessageKind =
  (typeof SseMessageKind)[keyof typeof SseMessageKind];

export type SseMessage =
  | { kind: typeof SseMessageKind.Open }
  | { kind: typeof SseMessageKind.Event; event: ServerEvent }
  | { kind: typeof SseMessageKind.Error };

export const SseStreamStatus = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Online: 'online',
  Reconnecting: 'reconnecting',
} as const;

export type SseStreamStatus =
  (typeof SseStreamStatus)[keyof typeof SseStreamStatus];
