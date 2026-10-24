import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';

import { ApiError } from '../../../core/http/api-error';
import { AuthDataAccessService } from '../../data-access/auth/auth-data-access.service';

import {
  AuthUserDomainModel,
  CredentialsDomainModel,
} from './auth-domain.models';

@Service()
export class AuthDomainService {
  #authDataAccess = inject(AuthDataAccessService);

  login(credentials: CredentialsDomainModel): Observable<AuthUserDomainModel> {
    return this.#authDataAccess.login(credentials);
  }

  logout(): Observable<void> {
    return this.#authDataAccess.logout();
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
