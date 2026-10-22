import { ChangeDetectionStrategy, Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { HealthResponse } from '@restaurant/shared-api-types';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatProgressSpinnerModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly health = httpResource<HealthResponse>(() => '/api/health');
}
