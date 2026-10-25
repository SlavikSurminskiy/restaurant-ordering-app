import {
  HttpClient,
  HttpStatusCode,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiError, NETWORK_ERROR_STATUS } from './api-error';
import {
  RETRY_COUNT,
  RETRY_BASE_DELAY_MS,
  apiErrorInterceptor,
} from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retries a GET after a server error and returns the later success', async () => {
    const { http, backend, observer } = Arrange.setup();

    http.get('/api/menu').subscribe(observer);
    backend.expectOne('/api/menu').flush(null, Arrange.serverError);
    await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
    backend.expectOne('/api/menu').flush({ ok: true });

    expect(observer.next).toHaveBeenCalledWith({ ok: true });
    expect(observer.error).not.toHaveBeenCalled();
  });

  it('gives up after the retry limit with a readable ApiError', async () => {
    const { http, backend, observer } = Arrange.setup();

    http.get('/api/menu').subscribe(observer);

    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      backend.expectOne('/api/menu').flush(null, Arrange.serverError);
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS * attempt);
    }

    backend.expectOne('/api/menu').flush(null, Arrange.serverError);

    const [error] = observer.error.mock.calls[0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: HttpStatusCode.ServiceUnavailable,
      message: 'The server is having trouble. Please try again in a moment.',
    });
  });

  it('does not retry a GET on a client error', () => {
    const { http, backend, observer } = Arrange.setup();

    http.get('/api/menu').subscribe(observer);
    backend.expectOne('/api/menu').flush(null, {
      status: HttpStatusCode.NotFound,
      statusText: 'Not Found',
    });

    backend.expectNone('/api/menu');
    expect(observer.error).toHaveBeenCalledWith(
      new ApiError(
        HttpStatusCode.NotFound,
        'The requested data was not found.',
      ),
    );
  });

  it('does not retry a GET on an internal server error', () => {
    const { http, backend, observer } = Arrange.setup();

    http.get('/api/menu').subscribe(observer);
    backend.expectOne('/api/menu').flush(null, {
      status: HttpStatusCode.InternalServerError,
      statusText: 'Internal Server Error',
    });

    backend.expectNone('/api/menu');
    expect(observer.error).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-GET requests', async () => {
    const { http, backend, observer } = Arrange.setup();

    http.post('/api/orders', {}).subscribe(observer);
    backend.expectOne('/api/orders').flush(null, Arrange.serverError);
    await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS * RETRY_COUNT);

    backend.expectNone('/api/orders');
    expect(observer.error).toHaveBeenCalledTimes(1);
  });

  it('keeps the error response body', () => {
    const { http, backend, observer } = Arrange.setup();
    const body = { conflicts: [] };

    http.post('/api/orders', {}).subscribe(observer);
    backend.expectOne('/api/orders').flush(body, {
      status: HttpStatusCode.Conflict,
      statusText: 'Conflict',
    });

    expect(observer.error).toHaveBeenCalledWith(
      new ApiError(
        HttpStatusCode.Conflict,
        'The data changed meanwhile. Please review and try again.',
        body,
      ),
    );
  });

  it('reports a network failure as an unreachable server', async () => {
    const { http, backend, observer } = Arrange.setup();

    http.get('/api/menu').subscribe(observer);
    for (let attempt = 1; attempt <= RETRY_COUNT + 1; attempt++) {
      backend.expectOne('/api/menu').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS * attempt);
    }

    expect(observer.error).toHaveBeenCalledWith(
      new ApiError(
        NETWORK_ERROR_STATUS,
        'Cannot reach the server. Check your connection and try again.',
      ),
    );
  });
});

const Arrange = {
  setup() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const next = vi.fn();
    const error = vi.fn();

    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
      observer: { next, error },
    };
  },

  serverError: {
    status: HttpStatusCode.ServiceUnavailable,
    statusText: 'Service Unavailable',
  },
};
