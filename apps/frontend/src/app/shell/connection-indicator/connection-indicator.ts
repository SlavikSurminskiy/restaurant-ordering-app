import { computed, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { SseStatusService } from '@restaurant/frontend/domain/sse';

import { STATUS_VIEW } from './connection-indicator.constants';
import { ConnectionTone } from './connection-indicator.enums';

@Component({
  selector: 'app-connection-indicator',
  imports: [MatIconModule],
  templateUrl: './connection-indicator.html',
  styleUrl: './connection-indicator.scss',
  host: {
    role: 'status',
    '[class]': "'connection-indicator--' + view().tone",
  },
})
export class ConnectionIndicator {
  readonly #connectionStatus = inject(SseStatusService);

  protected readonly ConnectionTone = ConnectionTone;

  protected readonly view = computed(
    () => STATUS_VIEW[this.#connectionStatus.status()],
  );
}
