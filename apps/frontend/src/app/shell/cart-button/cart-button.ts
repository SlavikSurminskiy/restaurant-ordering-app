import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { CartStore } from '../../features/cart/cart-store/cart.store';

@Component({
  selector: 'app-cart-button',
  imports: [RouterLink, MatIconModule, MatBadgeModule, MatButtonModule],
  templateUrl: './cart-button.html',
})
export class CartButton {
  protected readonly store = inject(CartStore);
}
