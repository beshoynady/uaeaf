import type { RequiredPermission } from '../decorators/permissions.decorator.js';

/**
 * Access-token payload. `permissions` is the user's roleIds -> permissionIds
 * set flattened at login/refresh time (BE-PLAN-010 §4.4) — PermissionsGuard
 * reads this directly, it does not query users/roles/permissions per request.
 *
 * `type: 'access'` distinguishes this from RefreshTokenPayload below — both
 * are signed with the same secret, so without this claim a refresh token
 * (which has no `permissions`) could be presented as a Bearer access token
 * (auth-security-audit-2026-09-05.md P1, now closed alongside the P0 items:
 * JwtStrategy.validate() rejects anything but type: 'access').
 */
export interface JwtPayload {
  sub: string;
  type: 'access';
  permissions: RequiredPermission[];
}

/** Refresh-token payload — deliberately carries no `permissions` (they are
 *  re-resolved fresh from the DB on every refresh, see AuthService.refresh()).
 *  `sessionId` identifies the `authSessions` row this token belongs to
 *  (auth-security-audit-2026-09-05.md P0 #4) — that row is what actually
 *  gets revoked on logout, and what makes reuse-of-a-rotated-token
 *  detectable, since the JWT's own signature stays valid until its
 *  natural 7-day expiry regardless of what AuthService does server-side. */
export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  sessionId: string;
}

/** What `request.user` holds once JwtAuthGuard has validated the token. */
export interface AuthenticatedUser {
  userId: string;
  permissions: RequiredPermission[];
}
