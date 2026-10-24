export const BACKOFF_BASE_DELAY_MS = 1000;
export const BACKOFF_MAX_DELAY_MS = 30_000;

/**
 * Exponential backoff: the delay doubles with every consecutive failure
 * (1 s, 2 s, 4 s, 8 s, 16 s) and then stays at the cap (30 s).
 *
 * @param failures consecutive failures so far, starting at 1
 */
export function backoffDelay(failures: number): number {
  return Math.min(
    BACKOFF_BASE_DELAY_MS * 2 ** (failures - 1),
    BACKOFF_MAX_DELAY_MS,
  );
}
