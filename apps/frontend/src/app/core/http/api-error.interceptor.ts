import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpStatusCode,
} from '@angular/common/http';
import { catchError, retry, throwError, timer } from 'rxjs';

import { ApiError, NETWORK_ERROR_STATUS } from './api-error';

export const RETRY_COUNT = 2;
export const RETRY_BASE_DELAY_MS = 500;

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const response$ = next(req);
  const withRetry$ =
    req.method === 'GET'
      ? response$.pipe(
          retry({
            count: RETRY_COUNT,
            delay: (error, attempt) =>
              isTransient(error)
                ? timer(RETRY_BASE_DELAY_MS * attempt)
                : throwError(() => error),
          }),
        )
      : response$;

  return withRetry$.pipe(
    catchError((error: unknown) =>
      throwError(() =>
        error instanceof HttpErrorResponse
          ? ApiError.fromResponse(error)
          : error,
      ),
    ),
  );
};

const TRANSIENT_STATUSES = new Set<number>([
  NETWORK_ERROR_STATUS,
  HttpStatusCode.BadGateway,
  HttpStatusCode.ServiceUnavailable,
  HttpStatusCode.GatewayTimeout,
]);

function isTransient(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse && TRANSIENT_STATUSES.has(error.status)
  );
}
