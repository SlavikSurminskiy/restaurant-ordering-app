import { Module } from '@nestjs/common';

import { DiscountModule } from '../discount/discount.module';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderConflictsService } from './order-conflicts/order-conflicts.service';
import { OrderStatusService } from './order-status/order-status.service';
import { OrderStatusTimer } from './order-status-timer/order-status-timer';

@Module({
  imports: [DiscountModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderConflictsService,
    OrderStatusService,
    OrderStatusTimer,
  ],
})
export class OrdersModule {}
