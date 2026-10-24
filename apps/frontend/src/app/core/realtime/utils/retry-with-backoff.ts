import { tap, timer, defer, retry, MonoTypeOperatorFunction } from 'rxjs';

import { backoffDelay } from './backoff-delay';

export interface RetryWithBackoffConfig<T> {
  /** Starts the delays over when the source emits a value this returns `true` for. */
  resetOn?: (value: T) => boolean;
}

/**
 * Resubscribes to the source after every error, waiting `backoffDelay(n)`
 * before the n-th consecutive retry.
 */
export function retryWithBackoff<T>(
  config: RetryWithBackoffConfig<T> = {},
): MonoTypeOperatorFunction<T> {
  const { resetOn } = config;

  return (source) =>
    defer(() => {
      let failures = 0;

      return source.pipe(
        tap((value) => {
          if (resetOn?.(value)) {
            failures = 0;
          }
        }),
        retry({ delay: () => timer(backoffDelay(++failures)) }),
      );
    });
}
