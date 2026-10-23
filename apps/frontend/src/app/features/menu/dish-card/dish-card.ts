import { input, computed, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { Dish } from '@restaurant/shared-api-types';

import { formatMoney } from '../../../shared/ui/pipes/money.pipe';

@Component({
  selector: 'app-dish-card',
  imports: [MatIconModule, NgOptimizedImage],
  templateUrl: './dish-card.html',
  styleUrl: './dish-card.scss',
  host: {
    class: 'dish-card',
    '[class.dish-card--unavailable]': '!dish().available',
  },
})
export class DishCard {
  readonly dish = input.required<Dish>();

  protected readonly priceLabel = computed(() => {
    const { price } = this.dish();

    return price === null ? 'Your price' : formatMoney(price);
  });
}
