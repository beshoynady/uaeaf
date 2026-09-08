/**
 * How long the account stays locked — as far as the API is willing to say.
 *
 * The API's lockout is a plain 401 whose body distinguishes it from bad
 * credentials by message text alone; there is no `Retry-After` header today
 * (verified 2026-09-08 against api/src/.../auth.service.ts). So the honest
 * default is `null`: the screen shows "locked for up to N minutes" and runs
 * no clock. Inventing one from LOCKOUT_DURATION_MINUTES would be wrong on
 * every retry — a user who reloads eight minutes in would watch a fresh
 * 15:00 count down, and the form would still refuse them at 00:00.
 *
 * When the API starts sending the header, `parseRetryAfter` returns a number
 * and the countdown appears. No other change is needed.
 */

/** Above this, a "lockout" is almost certainly a malformed header rather
 *  than a real wait, and a static message beats an absurd clock. */
const MAX_PLAUSIBLE_WAIT_SECONDS = 60 * 60;

/** @returns whole seconds to wait, or null when the API did not say. */
export function parseRetryAfter(header: string | null, now: number): number | null {
  const raw = header?.trim();
  if (!raw) {
    return null;
  }

  const seconds = /^-?\d+$/.test(raw) ? Number(raw) : httpDateToSeconds(raw, now);
  if (seconds === null || !Number.isFinite(seconds)) {
    return null;
  }

  const clamped = Math.max(0, seconds);
  return clamped > MAX_PLAUSIBLE_WAIT_SECONDS ? null : clamped;
}

function httpDateToSeconds(raw: string, now: number): number | null {
  const deadline = Date.parse(raw);
  return Number.isNaN(deadline) ? null : Math.ceil((deadline - now) / 1000);
}

/**
 * `MM:SS`, with minutes allowed to exceed 59 rather than wrapping — a
 * countdown that silently restarts at the hour is worse than a long one.
 */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
