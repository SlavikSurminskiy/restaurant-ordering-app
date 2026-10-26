import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthDomainService } from '@restaurant/frontend/domain/auth';

import { AuthStore } from '../../features/auth/auth-store/auth.store';

@Component({
  selector: 'app-navigation',
  imports: [MatButtonModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
})
export class Navigation {
  readonly #router = inject(Router);
  readonly #authDomainService = inject(AuthDomainService);

  protected readonly store = inject(AuthStore);

  signOut() {
    this.#authDomainService.logout().subscribe({
      next: () => {
        this.store.clearUser();
        void this.#router.navigateByUrl('/menu');
      },
    });
  }
}
