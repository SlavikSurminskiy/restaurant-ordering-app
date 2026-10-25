import { input, output, computed, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Dish } from '@restaurant/shared-api-types';
import { formatMoney } from '@restaurant/frontend/ui';

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

  readonly add = output<void>();

  protected readonly priceLabel = computed(() => {
    const { price } = this.dish();

    return price === null ? 'Your price' : formatMoney(price);
  });
}
