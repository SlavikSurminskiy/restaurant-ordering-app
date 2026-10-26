import { SseConnectionStatus } from '@restaurant/frontend/domain/sse';

import { ConnectionTone } from './connection-indicator.enums';
import { StatusView } from './connection-indicator.models';

export const STATUS_VIEW: Record<SseConnectionStatus, StatusView> = {
  [SseConnectionStatus.Disconnected]: {
    icon: 'cloud_off',
    label: 'Disconnected',
    description: 'Live updates are off',
    tone: ConnectionTone.Error,
  },
  [SseConnectionStatus.Connecting]: {
    icon: 'sync',
    label: 'Connecting…',
    description: 'Setting up live menu updates',
    tone: ConnectionTone.Warning,
  },
  [SseConnectionStatus.Online]: {
    icon: 'cloud_done',
    label: 'Online',
    description: 'Menu and prices update live',
    tone: ConnectionTone.Ok,
  },
  [SseConnectionStatus.Reconnecting]: {
    icon: 'sync',
    label: 'Reconnecting…',
    description: 'Connection lost, menu may be out of date',
    tone: ConnectionTone.Warning,
  },
  [SseConnectionStatus.Offline]: {
    icon: 'cloud_off',
    label: 'Offline',
    description: 'No internet, menu may be out of date',
    tone: ConnectionTone.Error,
  },
};
