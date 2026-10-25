import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';

import { MoneyPipe } from '@restaurant/frontend/ui';

import { AppData } from '../app.resolver';

import { Account } from './account/account';
import { ConnectionIndicator } from './connection-indicator/connection-indicator';

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterOutlet,
    MatIconModule,
    MatToolbarModule,

    Account,
    MoneyPipe,
    ConnectionIndicator,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly appData = input.required<AppData>();

  protected readonly discount = computed(() => this.appData().discount);
}
