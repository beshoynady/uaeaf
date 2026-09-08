/**
 * Mirrors the API's `RequiredPermission` shape
 * (api/src/common/decorators/permissions.decorator.ts).
 *
 * These grants arrive on `GET /users/me`, resolved by the API from the
 * database for that request. They are NOT read from the access token: since
 * the owner's 2026-09-07 decision the token carries roleIds only, precisely
 * so that what the dashboard shows cannot drift from what the API allows.
 *
 * IMPORTANT — what this file is and is not:
 * these helpers decide what the dashboard *shows*. They are not an
 * authorization system. Every actual read and write goes to the API, where
 * `PermissionsGuard` re-checks the same pair server-side. Hiding a button
 * here without the API refusing the call would be theatre; the API refusing
 * the call without hiding the button would just be a bad experience. Both
 * are needed, and only one of them is the security boundary.
 */
export interface PermissionGrant {
  resourceType: string;
  action: string;
}

/** Exact resource + action match — the same equality `PermissionsGuard` applies. */
export function hasPermission(
  grants: readonly PermissionGrant[],
  resourceType: string,
  action: string,
): boolean {
  return grants.some((grant) => grant.resourceType === resourceType && grant.action === action);
}

/** True when the user holds *any* action on a resource. Used for navigation:
 *  a user who can only Read `roles` should still see the Roles link, they
 *  just land on a screen with no edit affordances. */
export function canAccessResource(
  grants: readonly PermissionGrant[],
  resourceType: string,
): boolean {
  return grants.some((grant) => grant.resourceType === resourceType);
}
