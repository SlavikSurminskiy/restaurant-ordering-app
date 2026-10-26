import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, Observable, of, tap, throwError } from 'rxjs';

import { AuthDataAccessService } from '@restaurant/frontend/data-access/auth';
import { SseDataAccessService } from '@restaurant/frontend/data-access/sse';
import { ApiError } from '@restaurant/frontend/core/http';

import {
  AuthUserDomainModel,
  CredentialsDomainModel,
} from './auth-domain.models';

@Service()
export class AuthDomainService {
  #authDataAccess = inject(AuthDataAccessService);
  #sseDataAccess = inject(SseDataAccessService);

  login(credentials: CredentialsDomainModel): Observable<AuthUserDomainModel> {
    return this.#authDataAccess
      .login(credentials)
      .pipe(tap(() => this.#sseDataAccess.reconnect()));
  }

  logout(): Observable<void> {
    return this.#authDataAccess
      .logout()
      .pipe(tap(() => this.#sseDataAccess.reconnect()));
  }

  getCurrentUser(): Observable<AuthUserDomainModel | null> {
    return this.#authDataAccess
      .getMe()
      .pipe(
        catchError((error: unknown) =>
          error instanceof ApiError &&
          error.status === HttpStatusCode.Unauthorized
            ? of(null)
            : throwError(() => error),
        ),
      );
  }
}
