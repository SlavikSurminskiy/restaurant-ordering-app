import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientModule } from '@nestjs/http-client';

import {
  DEFAULT_MENU_SERVICE_URL,
  MENU_REQUEST_TIMEOUT_MS,
} from './menu-client/menu-client.constants';
import { MenuClient } from './menu-client/menu-client.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderConflictsService } from './order-conflicts/order-conflicts.service';
import { OrderStatusService } from './order-status/order-status.service';
import { OrderStatusTimer } from './order-status-timer/order-status-timer';

@Module({
  imports: [
    // The HttpClient MenuClient uses: every request goes to menu-service. POST is not retried
    // by default; the checkout retries with its Idempotency-Key instead.
    HttpClientModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseUrl: config.get<string>(
          'MENU_SERVICE_URL',
          DEFAULT_MENU_SERVICE_URL,
        ),
        timeout: MENU_REQUEST_TIMEOUT_MS,
      }),
    }),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    MenuClient,
    OrderConflictsService,
    OrderStatusService,
    OrderStatusTimer,
  ],
})
export class OrdersModule {}
