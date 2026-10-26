import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { OrderStatusDomainModel } from '@restaurant/frontend/domain/orders';
import { MoneyPipe } from '@restaurant/frontend/ui';

import { NEXT_STATUS_ACTIONS, ORDER_STATUS_LABELS } from '../orders.constants';
import { OrderCardModel } from '../orders.models';

@Component({
  selector: 'app-order-card',
  imports: [DatePipe, MatButtonModule, MoneyPipe],
  templateUrl: './order-card.html',
  styleUrl: './order-card.scss',
})
export class OrderCard {
  readonly card = input.required<OrderCardModel>();
  /** Admins see who ordered and can change the status. */
  readonly canManage = input(false);
  readonly isUpdating = input(false);

  readonly advance = output<OrderStatusDomainModel>();
  readonly cancelOrder = output<void>();

  protected readonly ORDER_STATUS_LABELS = ORDER_STATUS_LABELS;
  protected readonly NEXT_STATUS_ACTIONS = NEXT_STATUS_ACTIONS;
}
