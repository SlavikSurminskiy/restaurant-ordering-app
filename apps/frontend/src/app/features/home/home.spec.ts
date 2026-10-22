import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';

import { HealthResponse } from '@restaurant/shared-api-types';

import { Home } from './home';

describe('Home', () => {
  async function setup() {
    const view = await render(Home, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { view, http: TestBed.inject(HttpTestingController) };
  }

  it('shows API and database status from /api/health', async () => {
    const { http } = await setup();
    const response: HealthResponse = {
      status: 'up',
      database: 'up',
      timestamp: new Date().toISOString(),
    };

    http.expectOne('/api/health').flush(response);

    expect(await screen.findByText('API: up')).toBeTruthy();
    expect(screen.getByText('Database: up')).toBeTruthy();
  });

  it('shows API as down when the request fails', async () => {
    const { http } = await setup();

    http
      .expectOne('/api/health')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(await screen.findByText('API: down')).toBeTruthy();
  });
});
