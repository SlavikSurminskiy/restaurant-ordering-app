import { SseConnectionStatus } from '@restaurant/frontend/core/realtime';

import { StatusView } from './connection-indicator.models';

export const STATUS_VIEW: Record<SseConnectionStatus, StatusView> = {
  [SseConnectionStatus.Disconnected]: {
    icon: 'cloud_off',
    label: 'Disconnected',
    description: 'Live updates are off',
    degraded: false,
  },
  [SseConnectionStatus.Connecting]: {
    icon: 'sync',
    label: 'Connecting…',
    description: 'Setting up live menu updates',
    degraded: false,
  },
  [SseConnectionStatus.Online]: {
    icon: 'cloud_done',
    label: 'Online',
    description: 'Menu and prices update live',
    degraded: false,
  },
  [SseConnectionStatus.Reconnecting]: {
    icon: 'sync',
    label: 'Reconnecting…',
    description: 'Connection lost, menu may be out of date',
    degraded: true,
  },
  [SseConnectionStatus.Offline]: {
    icon: 'cloud_off',
    label: 'Offline',
    description: 'No internet, menu may be out of date',
    degraded: true,
  },
};
