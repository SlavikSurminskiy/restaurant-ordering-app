import { computed, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { SseConnectionStatusService } from '@restaurant/frontend/core/realtime';

import { STATUS_VIEW } from './connection-indicator.constants';

@Component({
  selector: 'app-connection-indicator',
  imports: [MatIconModule],
  templateUrl: './connection-indicator.html',
  styleUrl: './connection-indicator.scss',
  host: {
    role: 'status',
    '[class.connection-indicator--degraded]': 'view().degraded',
  },
})
export class ConnectionIndicator {
  readonly #connectionStatus = inject(SseConnectionStatusService);

  protected readonly view = computed(
    () => STATUS_VIEW[this.#connectionStatus.status()],
  );
}
