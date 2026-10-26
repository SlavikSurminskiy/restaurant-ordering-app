import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AuthStore } from '../../features/auth/auth-store/auth.store';

@Component({
  selector: 'app-account',
  imports: [MatIconModule],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  protected readonly store = inject(AuthStore);
}
