import type { RequiredPermission } from '../decorators/permissions.decorator.js';

/**
 * Access-token payload. `permissions` is the user's roleIds -> permissionIds
 * set flattened at login/refresh time (BE-PLAN-010 §4.4) — PermissionsGuard
 * reads this directly, it does not query users/roles/permissions per request.
 */
export interface JwtPayload {
  sub: string;
  permissions: RequiredPermission[];
}

/** What `request.user` holds once JwtAuthGuard has validated the token. */
export interface AuthenticatedUser {
  userId: string;
  permissions: RequiredPermission[];
}
