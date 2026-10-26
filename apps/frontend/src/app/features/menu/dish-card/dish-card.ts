import {
  input,
  output,
  computed,
  Component,
  linkedSignal,
} from '@angular/core';
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

  readonly add = output<number>();

  protected readonly MAX_ADD_QUANTITY = MAX_ADD_QUANTITY;

  // The virtual list reuses cards for other dishes, so a new dish starts at 1 again.
  protected readonly quantity = linkedSignal({
    source: () => this.dish().id,
    computation: () => 1,
  });

  protected readonly priceLabel = computed(() => {
    const { price } = this.dish();

    return price === null ? 'Your price' : formatMoney(price);
  });

  protected changeQuantity(by: number): void {
    this.quantity.update((quantity) =>
      Math.min(Math.max(quantity + by, 1), MAX_ADD_QUANTITY),
    );
  }

  protected addToCart(): void {
    this.add.emit(this.quantity());
    this.quantity.set(1);
  }
}
