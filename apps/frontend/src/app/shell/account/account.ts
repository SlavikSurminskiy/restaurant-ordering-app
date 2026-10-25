import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { AuthDomainService } from '../../shared/domain/auth/auth-domain.service';
import { SseService } from '../../core/realtime/sse.service';

import { AuthStore } from '../../features/auth/auth-store/auth.store';

@Component({
  selector: 'app-account',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  readonly #router = inject(Router);
  readonly #authDomainService = inject(AuthDomainService);
  readonly #sseService = inject(SseService);

  protected readonly store = inject(AuthStore);

  signOut() {
    this.#authDomainService.logout().subscribe({
      next: () => {
        this.store.clearUser();
        this.#sseService.reconnect();
        void this.#router.navigateByUrl('/menu');
      },
    });
  }
}
