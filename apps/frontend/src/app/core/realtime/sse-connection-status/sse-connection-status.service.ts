import { computed, inject, Service } from '@angular/core';

import { NetworkStatusService } from '../../network/network-status/network-status.service';
import { SseService } from '../sse.service';

import { SseConnectionStatus } from './sse-connection-status.enums';

@Service()
export class SseConnectionStatusService {
  readonly #sse = inject(SseService);
  readonly #network = inject(NetworkStatusService);

  readonly status = computed((): SseConnectionStatus =>
    this.#network.isOnline() ? this.#sse.status() : SseConnectionStatus.Offline,
  );
}
