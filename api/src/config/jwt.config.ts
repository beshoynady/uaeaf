import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

/**
 * JWT lifetimes, confirmed in BE-PLAN-010 §4.3 — not placeholders:
 * - accessExpiry: exactly 15 minutes. This is the security boundary that makes
 *   PermissionsGuard's JWT-cached permission check safe without a per-request
 *   DB lookup (see common/guards/permissions.guard.ts).
 * - refreshExpiry: 7 days. The refresh token carries no permissions — it only
 *   mints a new access token, re-resolving roleIds/permissionIds/accountStatus
 *   at that moment (see modules/platform-administration/auth/auth.service.ts).
 */
export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  // Cast at this single source: validation.schema.ts already
  // constrains these to duration-string env vars, and @nestjs/jwt's
  // JwtSignOptions.expiresIn wants `ms`'s branded StringValue, not a plain
  // `string`, even though every valid value here (e.g. "15m", "7d") is one.
  accessExpiry: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as StringValue,
  refreshExpiry: (process.env.JWT_REFRESH_EXPIRY ?? '7d') as StringValue,
}));
