import { Component, computed, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';

import { HealthResponse } from '@restaurant/shared-api-types';

import { AppData } from '../app.resolver';
import { MoneyPipe } from '../shared/ui/pipes/money.pipe';

@Component({
  selector: 'app-shell',
  imports: [MatToolbarModule, RouterOutlet, MoneyPipe],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly appData = input.required<AppData>();

  protected readonly health = httpResource<HealthResponse>(() => '/api/health');

  protected readonly discount = computed(() => this.appData().discount);
}
