import { concat, defer, Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { backoffDelay } from './backoff-delay';
import { retryWithBackoff } from './retry-with-backoff';

describe(retryWithBackoff.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resubscribe after backoffDelay of the consecutive failure count', () => {
    const source = Arrange.createSource([
      throwError(() => new Error('down')),
      throwError(() => new Error('down')),
      of('menu'),
    ]);
    const received: string[] = [];
    source.$.pipe(retryWithBackoff()).subscribe((value) =>
      received.push(value),
    );

    vi.advanceTimersByTime(backoffDelay(1));
    expect(source.subscriptions()).toBe(2);

    vi.advanceTimersByTime(backoffDelay(2) - 1);
    expect(source.subscriptions()).toBe(2);
    vi.advanceTimersByTime(1);
    expect(source.subscriptions()).toBe(3);
    expect(received).toEqual(['menu']);
  });

  it('should start the delays over after a value matching resetOn', () => {
    const source = Arrange.createSource([
      throwError(() => new Error('down')),
      concat(
        of('open'),
        throwError(() => new Error('down')),
      ),
      of('open'),
    ]);
    source.$.pipe(
      retryWithBackoff({ resetOn: (value) => value === 'open' }),
    ).subscribe();

    vi.advanceTimersByTime(backoffDelay(1));
    expect(source.subscriptions()).toBe(2);

    vi.advanceTimersByTime(backoffDelay(1));
    expect(source.subscriptions()).toBe(3);
  });

  it('should count failures separately for every subscription', () => {
    const operator = retryWithBackoff();
    const first = Arrange.createSource([
      throwError(() => new Error('down')),
      of('menu'),
    ]);
    const second = Arrange.createSource([
      throwError(() => new Error('down')),
      of('menu'),
    ]);

    first.$.pipe(operator).subscribe();
    vi.advanceTimersByTime(backoffDelay(1));
    second.$.pipe(operator).subscribe();
    vi.advanceTimersByTime(backoffDelay(1));

    expect(second.subscriptions()).toBe(2);
  });
});

const Arrange = {
  createSource<T>(attempts: Observable<T>[]) {
    let subscriptions = 0;

    return {
      $: defer(
        () => attempts[subscriptions++] ?? throwError(() => new Error()),
      ),
      subscriptions: () => subscriptions,
    };
  },
};
