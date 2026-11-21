import { Global, Module } from '@nestjs/common';

import { EventBus } from './event-bus/event-bus';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { InternalEventsController } from './internal-events.controller';

@Global()
@Module({
  controllers: [EventsController, InternalEventsController],
  providers: [EventBus, EventsService],
  exports: [EventBus],
})
export class EventsModule {}
