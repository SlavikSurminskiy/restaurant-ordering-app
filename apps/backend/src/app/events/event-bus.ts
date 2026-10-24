import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';

import { ServerEvent } from '@restaurant/shared-api-types';

@Injectable()
export class EventBus implements OnModuleDestroy {
  private readonly events = new Subject<ServerEvent>();

  readonly events$ = this.events.asObservable();

  publish(event: ServerEvent): void {
    this.events.next(event);
  }

  onModuleDestroy(): void {
    this.events.complete();
  }
}
