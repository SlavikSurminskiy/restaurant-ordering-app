import {
  BACKOFF_BASE_DELAY_MS,
  BACKOFF_MAX_DELAY_MS,
  backoffDelay,
} from './backoff-delay';

describe(backoffDelay.name, () => {
  it.each([
    [1, 1000],
    [2, 2000],
    [3, 4000],
    [4, 8000],
    [5, 16_000],
  ])('should wait %i failure(s) → %i ms', (failures, expected) => {
    expect(backoffDelay(failures)).toBe(expected);
  });

  it('should start at the base delay', () => {
    expect(backoffDelay(1)).toBe(BACKOFF_BASE_DELAY_MS);
  });

  it('should stop growing at the max delay', () => {
    expect(backoffDelay(6)).toBe(BACKOFF_MAX_DELAY_MS);
    expect(backoffDelay(50)).toBe(BACKOFF_MAX_DELAY_MS);
  });
});
