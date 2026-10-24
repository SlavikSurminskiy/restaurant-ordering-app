import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { AuthUser, LoginRequest } from './auth-data-access.models';

@Service()
export class AuthDataAccessService {
  #http = inject(HttpClient);

  login(credentials: LoginRequest) {
    return this.#http.post<AuthUser>('/api/auth/login', credentials);
  }

  logout() {
    return this.#http.post<void>('/api/auth/logout', null);
  }

  getMe() {
    return this.#http.get<AuthUser>('/api/auth/me');
  }
}
