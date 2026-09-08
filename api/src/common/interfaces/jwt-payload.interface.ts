import type { RequiredPermission } from '../decorators/permissions.decorator.js';

/**
 * Access-token payload: identity and role membership, nothing more.
 *
 * `roleIds` replaced the flattened permission set that BE-PLAN-010 §4.4
 * embedded here (owner decision 2026-09-07). Three reasons were given, and
 * each maps to something visible in the code:
 *
 *  - Least data in transit. A leaked token now discloses which roles the
 *    holder belongs to, not the exact shape of their authority.
 *  - Immediate consistency. Authority is re-read from the database on every
 *    request (JwtStrategy -> RolesService.resolvePermissions), so editing a
 *    role takes effect on that role's holders at once, instead of after up
 *    to 15 minutes or a refresh.
 *  - One source of truth. The database is the only place authority lives;
 *    there is no second copy in a token that can disagree with it.
 *
 * There is deliberately no `jti`: revocation already runs through
 * `sessionId` and the `authSessions` row on the refresh token, and a `jti`
 * on the access token would buy nothing without a per-request denylist —
 * precisely the extra storage layer the same decision ruled out.
 *
 * `iat`/`exp` are added by @nestjs/jwt at signing time and are not declared
 * here, which is why this describes what we sign, not what comes back.
 *
 * `type: 'access'` distinguishes this from RefreshTokenPayload below — both
 * are signed with the same secret, so without this claim a refresh token
 * could be presented as a Bearer access token (auth-security-audit-
 * 2026-09-05.md P1: JwtStrategy.validate() rejects anything but 'access').
 */
export interface JwtPayload {
  sub: string;
  type: 'access';
  roleIds: string[];
}

/** Refresh-token payload. `sessionId` identifies the `authSessions` row this
 *  token belongs to (auth-security-audit-2026-09-05.md P0 #4) — that row is
 *  what actually gets revoked on logout, and what makes reuse of a rotated
 *  token detectable, since the JWT's own signature stays valid until its
 *  natural 7-day expiry regardless of what AuthService does server-side. */
export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  sessionId: string;
}

/** What `request.user` holds once JwtAuthGuard has validated the token.
 *
 *  `permissions` is NOT read from the token — JwtStrategy resolves it from
 *  the database while building this object, so it is always current as of
 *  this request. `roleIds` is kept alongside it for audit and diagnostics:
 *  it records what the token claimed, which is what makes a denial
 *  explicable when a role has since changed underneath it. */
export interface AuthenticatedUser {
  userId: string;
  roleIds: string[];
  permissions: RequiredPermission[];
}
