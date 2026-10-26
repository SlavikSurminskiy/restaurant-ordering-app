import { input, output, computed, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Dish } from '@restaurant/shared-api-types';
import { formatMoney } from '@restaurant/frontend/ui';

import { MAX_ADD_QUANTITY } from './dish-card.constants';

@Component({
  selector: 'app-dish-card',
  imports: [MatIconModule, MatButtonModule, NgOptimizedImage],
  templateUrl: './dish-card.html',
  styleUrl: './dish-card.scss',
  host: {
    class: 'dish-card',
    '[class.dish-card--unavailable]': '!dish().available',
  },
})
export class DishCard {
  readonly dish = input.required<Dish>();
  /** Kept by the page: the virtual list reuses cards for other dishes. */
  readonly quantity = input(1);

  readonly quantityChange = output<number>();
  readonly add = output<void>();

  protected readonly MAX_ADD_QUANTITY = MAX_ADD_QUANTITY;

  protected readonly priceLabel = computed(() => {
    const { price } = this.dish();

    return price === null ? 'Your price' : formatMoney(price);
  });

  protected changeQuantity(by: number): void {
    this.quantityChange.emit(
      Math.min(Math.max(this.quantity() + by, 1), MAX_ADD_QUANTITY),
    );
  }
}
