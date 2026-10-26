import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';

import { MoneyPipe } from '@restaurant/frontend/ui';

import { AppData } from '../app.resolver';

import { Account } from './account/account';
import { CartButton } from './cart-button/cart-button';
import { ConnectionIndicator } from './connection-indicator/connection-indicator';
import { Navigation } from './navigation/navigation';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    MatIconModule,
    MatToolbarModule,

    Account,
    CartButton,
    MoneyPipe,
    ConnectionIndicator,
    Navigation,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly appData = input.required<AppData>();

  protected readonly discount = computed(() => this.appData().discount);
}
