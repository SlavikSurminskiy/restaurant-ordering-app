import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { OrderStatus } from '@restaurant/shared-api-types';
import {
  OrderDomainModel,
  OrdersDomainService,
  OrderStatusDomainModel,
} from '@restaurant/frontend/domain/orders';
import { ConfirmDialogOpenerService } from '@restaurant/frontend/ui';
import { errorMessage } from '@restaurant/frontend/core/http';

import { AuthStore } from '../auth/auth-store/auth.store';
import { LoadStatus } from '../menu/menu-store/menu-store.enums';

import { OrderCard } from './order-card/order-card';
import { OrdersService } from './orders.service';
import { OrdersStore } from './orders-store/orders.store';
import { OrdersStoreService } from './orders-store/orders-store.service';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, OrderCard],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
  providers: [OrdersStore, OrdersStoreService, OrdersService],
})
export class Orders {
  readonly #snackBar = inject(MatSnackBar);
  readonly #ordersService = inject(OrdersService);
  readonly #ordersDomainService = inject(OrdersDomainService);
  readonly #confirmDialogOpener = inject(ConfirmDialogOpenerService);

  protected readonly store = inject(OrdersStore);
  protected readonly authStore = inject(AuthStore);

  protected readonly LoadStatus = LoadStatus;

  protected readonly cards = computed(() =>
    this.#ordersService.buildCards(this.store.orders()),
  );

  protected readonly updatingIds = signal<ReadonlySet<string>>(new Set());

  protected advance(
    order: OrderDomainModel,
    status: OrderStatusDomainModel,
  ): void {
    this.#updateStatus(order, status);
  }

  protected cancel(order: OrderDomainModel): void {
    this.#confirmDialogOpener
      .openDialog({
        title: 'Cancel order',
        message: `Cancel the order of ${order.userName}?`,
        confirmLabel: 'Cancel order',
      })
      .pipe(filter(Boolean))
      .subscribe(() => this.#updateStatus(order, OrderStatus.Cancelled));
  }

  #updateStatus(order: OrderDomainModel, status: OrderStatusDomainModel): void {
    this.#setUpdating(order.id, true);

    this.#ordersDomainService.updateOrderStatus(order.id, status).subscribe({
      next: (updated) => this.store.upsertOrder(updated),
      error: (error: unknown) => {
        this.#setUpdating(order.id, false);
        this.#snackBar.open(errorMessage(error), 'Close', { duration: 5000 });
      },
      complete: () => this.#setUpdating(order.id, false),
    });
  }

  #setUpdating(id: string, updating: boolean): void {
    this.updatingIds.update((ids) => {
      const next = new Set(ids);

      if (updating) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }
}
