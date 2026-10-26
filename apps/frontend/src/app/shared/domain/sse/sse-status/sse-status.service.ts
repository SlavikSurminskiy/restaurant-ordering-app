import { computed, inject, Service } from '@angular/core';

import { NetworkStatusService } from '@restaurant/frontend/core/network';
import { SseDataAccessService } from '@restaurant/frontend/data-access/sse';

import { SseConnectionStatus } from './sse-status.enums';

@Service()
export class SseStatusService {
  readonly #sseDataAccess = inject(SseDataAccessService);
  readonly #network = inject(NetworkStatusService);

  readonly status = computed((): SseConnectionStatus =>
    this.#network.isOnline()
      ? this.#sseDataAccess.status()
      : SseConnectionStatus.Offline,
  );
}
