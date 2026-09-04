import { SetMetadata } from '@nestjs/common';

/** Metadata key RateLimitGuard reads via Reflector — shared between the
 *  @RateLimit() decorator that sets it and the guard that reads it. */
export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Max requests allowed per window, per client IP. */
  limit: number;
  /** Window length, in seconds. */
  windowSeconds: number;
}

/** Overrides RateLimitGuard's global default for this one route with a
 *  tighter limit — see `RateLimitGuard` for the default and the two
 *  routes this is actually applied to
 *  (schema-audit-2026-09-04.md §3.7/§6.7, P1 finding). */
export const RateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds } satisfies RateLimitOptions);
