import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';

import { UserRole } from '@restaurant/shared-api-types';

import { AuthUser, LoginRequest } from './auth-data-access.models';
import { AuthDataAccessService } from './auth-data-access.service';

describe(AuthDataAccessService.name, () => {
  it('login should post the credentials', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const credentials = Arrange.createCredentials();
    const user = Arrange.createUser();

    service.login(credentials).subscribe(next);

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(user);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    expect(next).toHaveBeenCalledWith(user);
  });

  it('logout should post to the logout URL', () => {
    const { service, httpMock } = Arrange.setup();

    service.logout().subscribe();

    const req = httpMock.expectOne('/api/auth/logout');
    req.flush(null);

    expect(req.request.method).toBe('POST');
  });

  it('getMe should call http.get with correct URL', () => {
    const { service, httpMock } = Arrange.setup();
    const next = vi.fn();
    const user = Arrange.createUser();

    service.getMe().subscribe(next);

    const req = httpMock.expectOne('/api/auth/me');
    req.flush(user);

    expect(req.request.method).toBe('GET');
    expect(next).toHaveBeenCalledWith(user);
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    return {
      service: TestBed.inject(AuthDataAccessService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  },

  createCredentials(): LoginRequest {
    return { email: 'admin@example.com', password: 'admin123' };
  },

  createUser(): AuthUser {
    return {
      id: 'u-admin',
      email: 'admin@example.com',
      name: 'Admin',
      role: UserRole.Admin,
    };
  },
};
