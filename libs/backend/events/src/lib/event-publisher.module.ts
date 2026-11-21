import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientModule } from '@nestjs/http-client';

import { EventPublisher } from './event-publisher';
import { DEFAULT_EVENTS_URL, PUBLISH_TIMEOUT_MS } from './events.constants';

@Global()
@Module({
  imports: [
    HttpClientModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseUrl: config.get<string>('EVENTS_URL', DEFAULT_EVENTS_URL),
        timeout: PUBLISH_TIMEOUT_MS,
      }),
    }),
  ],
  providers: [EventPublisher],
  exports: [EventPublisher],
})
export class EventPublisherModule {}
