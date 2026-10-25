import { HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  Validators,
  ReactiveFormsModule,
  NonNullableFormBuilder,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { AuthDomainService } from '@restaurant/frontend/domain/auth';
import { ApiError, errorMessage } from '@restaurant/frontend/core/http';
import { SseService } from '@restaurant/frontend/core/realtime';

import { AuthStore } from '../auth-store/auth.store';

import { DEMO_ACCOUNTS } from './login.constants';
import { DemoAccount } from './login.models';

@Component({
  selector: 'app-login',
  imports: [
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  readonly #router = inject(Router);
  readonly #store = inject(AuthStore);
  readonly #authDomainService = inject(AuthDomainService);
  readonly #sseService = inject(SseService);

  protected readonly DEMO_ACCOUNTS = DEMO_ACCOUNTS;

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected useDemoAccount({ email, password }: DemoAccount): void {
    this.form.setValue({ email, password });
  }

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.error.set(null);

    this.#authDomainService.login(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.#store.setUser(user);
        this.#sseService.reconnect();
        void this.#router.navigateByUrl('/menu');
      },
      error: (error) => {
        this.pending.set(false);
        this.error.set(this.#loginErrorMessage(error));
      },
      complete: () => {
        this.pending.set(false);
      },
    });
  }

  #loginErrorMessage(error: unknown): string {
    return error instanceof ApiError &&
      error.status === HttpStatusCode.Unauthorized
      ? 'Invalid email or password.'
      : errorMessage(error);
  }
}
