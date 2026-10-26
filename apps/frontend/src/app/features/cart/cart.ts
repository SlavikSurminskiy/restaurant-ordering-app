import {
  signal,
  inject,
  input,
  computed,
  Component,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { calculateTotals } from '@restaurant/shared-utils';
import {
  CreateOrderResult,
  OrdersDomainService,
  CreateOrderResultKind,
  OrderConflictDomainModel,
} from '@restaurant/frontend/domain/orders';
import { formatMoney, MoneyPipe } from '@restaurant/frontend/ui';
import { errorMessage } from '@restaurant/frontend/core/http';
import {
  SseConnectionStatus,
  SseConnectionStatusService,
} from '@restaurant/frontend/core/realtime';

import { AppData } from '../../app.resolver';
import { AuthStore } from '../auth/auth-store/auth.store';
import { LoadStatus } from '../menu/menu-store/menu-store.enums';
import { MenuStore } from '../menu/menu-store/menu.store';

import { CartLineModel } from './cart.models';
import { CartService } from './cart.service';
import { CartLine } from './cart-line/cart-line';
import { CartStore } from './cart-store/cart.store';
import { OpenPriceDialogOpenerService } from './open-price-dialog/open-price-dialog-opener.service';
import { OrderConflictsDialogOpenerService } from './order-conflicts-dialog/order-conflicts-dialog-opener.service';

@Component({
  selector: 'app-cart',
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,

    CartLine,
    MoneyPipe,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  providers: [CartService],
})
export class Cart {
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #snackBar = inject(MatSnackBar);
  readonly #cartService = inject(CartService);
  readonly #ordersDomainService = inject(OrdersDomainService);
  readonly #openPriceDialogOpener = inject(OpenPriceDialogOpenerService);
  readonly #orderConflictsDialogOpener = inject(
    OrderConflictsDialogOpenerService,
  );
  readonly #connectionStatus = inject(SseConnectionStatusService);
  readonly #menuStore = inject(MenuStore);

  protected readonly store = inject(CartStore);
  protected readonly authStore = inject(AuthStore);

  readonly appData = input.required<AppData>();

  protected readonly isOffline = computed(
    () => this.#connectionStatus.status() === SseConnectionStatus.Offline,
  );

  protected readonly isMenuLoaded = computed(
    () => this.#menuStore.status() === LoadStatus.Loaded,
  );

  protected readonly warnings = computed(() =>
    this.isMenuLoaded()
      ? this.#cartService.findWarnings(
          this.store.itemEntities(),
          this.#menuStore.dishEntityMap(),
        )
      : [],
  );

  protected readonly lines = computed(() =>
    this.#cartService.buildLines(
      this.store.itemEntities(),
      this.#menuStore.dishEntityMap(),
      this.warnings(),
    ),
  );

  protected readonly totals = computed(() =>
    calculateTotals(this.store.itemEntities(), this.appData().discount),
  );

  protected readonly isCheckingOut = signal(false);

  protected readonly canCheckout = computed(
    () =>
      this.isMenuLoaded() &&
      !this.isOffline() &&
      !this.isCheckingOut() &&
      this.warnings().length === 0,
  );

  protected checkout(): void {
    if (this.isCheckingOut()) {
      return;
    }

    // A retry after a lost response reuses the key, so the server returns the same order.
    const idempotencyKey = this.store.idempotencyKey() ?? crypto.randomUUID();

    this.store.setIdempotencyKey(idempotencyKey);
    this.isCheckingOut.set(true);

    this.#ordersDomainService
      .createOrder(
        this.#cartService.toRequest(this.store.itemEntities()),
        idempotencyKey,
      )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => this.#onCheckoutResult(result),
        error: (error: unknown) => {
          this.isCheckingOut.set(false);
          this.#snackBar.open(errorMessage(error), 'Close', {
            duration: 5000,
          });
        },
        complete: () => this.isCheckingOut.set(false),
      });
  }

  protected updateCart(): void {
    this.store.applyConflicts(this.warnings());
  }

  protected changeQuantity(dishId: string, quantity: number): void {
    this.store.setQuantity(dishId, quantity);
  }

  protected remove(dishId: string): void {
    this.store.remove(dishId);
  }

  protected editPrice({ item }: CartLineModel): void {
    this.#openPriceDialogOpener
      .openDialog({ dishName: item.name, unitPrice: item.unitPrice })
      .pipe(filter((price) => price !== undefined))
      .subscribe((price) => this.store.setUnitPrice(item.dishId, price));
  }

  #onCheckoutResult(result: CreateOrderResult): void {
    switch (result.kind) {
      case CreateOrderResultKind.Created:
        this.store.clear();
        this.#snackBar.open(
          `Order placed: ${formatMoney(result.order.total)}`,
          'Close',
          { duration: 5000 },
        );
        void this.#router.navigateByUrl('/orders');
        break;
      case CreateOrderResultKind.Conflicts:
        // The server knows the menu changed, so the menu shown here is out of date.
        this.#menuStore.reloadMenu();
        this.#showConflicts(result.conflicts);
        break;
    }
  }

  #showConflicts(conflicts: OrderConflictDomainModel[]): void {
    this.#orderConflictsDialogOpener
      .openDialog({
        warnings: this.#cartService.namedConflicts(
          conflicts,
          this.store.itemEntityMap(),
        ),
      })
      .pipe(filter(Boolean))
      .subscribe(() => this.store.applyConflicts(conflicts));
  }
}
