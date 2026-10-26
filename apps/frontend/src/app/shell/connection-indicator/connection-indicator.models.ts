import { ConnectionTone } from './connection-indicator.enums';

export interface StatusView {
  icon: string;
  label: string;
  description: string;
  /** Green when live, yellow while (re)connecting, red when live updates are off. */
  tone: ConnectionTone;
}
