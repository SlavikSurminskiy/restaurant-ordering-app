import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

/**
 * Status `HttpClient` reports when no response arrived (network failure,
 * CORS, aborted request). It is not an HTTP status, so `HttpStatusCode`
 * has no member for it.
 */
export const NETWORK_ERROR_STATUS = 0;

export class ApiError extends Error {
  /** `body` is the parsed error response, e.g. the conflicts of a 409. */
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse({ status, error }: HttpErrorResponse): ApiError {
    // Without a response `error` is the browser's ProgressEvent, not a body.
    const body = status === NETWORK_ERROR_STATUS ? null : (error ?? null);

    return new ApiError(status, messageForStatus(status), body);
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

function messageForStatus(status: number): string {
  if (status === NETWORK_ERROR_STATUS) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  if (status >= HttpStatusCode.InternalServerError) {
    return 'The server is having trouble. Please try again in a moment.';
  }
  if (status === HttpStatusCode.Unauthorized) {
    return 'Please sign in to continue.';
  }
  if (status === HttpStatusCode.Forbidden) {
    return 'You do not have permission to do this.';
  }
  if (status === HttpStatusCode.NotFound) {
    return 'The requested data was not found.';
  }
  if (status === HttpStatusCode.Conflict) {
    return 'The data changed meanwhile. Please review and try again.';
  }
  return 'The request could not be completed.';
}
