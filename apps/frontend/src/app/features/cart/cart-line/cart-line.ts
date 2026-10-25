import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { MoneyPipe } from '@restaurant/frontend/ui';

import { CartLineModel } from '../cart.models';
import { CartWarningPipe } from '../cart-warning/cart-warning.pipe';

@Component({
  selector: 'app-cart-line',
  imports: [MatIconModule, MatButtonModule, MoneyPipe, CartWarningPipe],
  templateUrl: './cart-line.html',
  styleUrl: './cart-line.scss',
})
export class CartLine {
  readonly line = input.required<CartLineModel>();

  readonly quantityChange = output<number>();
  readonly remove = output<void>();
  readonly editPrice = output<void>();
}
