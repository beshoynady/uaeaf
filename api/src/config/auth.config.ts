/**
 * Brute-force login lockout thresholds (confirmed 2026-09-02, addendum to
 * BE-PLAN-010). Plain named constants, not env-driven via ConfigService —
 * these are fixed application behavior, not per-environment configuration.
 *
 * LOCKOUT_DURATION_MINUTES happens to equal JWT_ACCESS_EXPIRY (15m, see
 * jwt.config.ts) — a convenient shared value, not a functional coupling
 * between the two; change either independently.
 */
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
