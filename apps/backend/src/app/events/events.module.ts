import { Global, Module } from '@nestjs/common';

import { EventBus } from './event-bus/event-bus';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Global()
@Module({
  controllers: [EventsController],
  providers: [EventBus, EventsService],
  exports: [EventBus],
})
export class EventsModule {}
