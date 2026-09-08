import type { PermissionResponse, RoleResponse, UserResponse } from "@/lib/api/types";
import { isConsequential } from "./permission-matrix";

/**
 * The numbers above the two administration screens.
 *
 * Every figure here is computed from the three lists the screen already
 * fetched — no extra round trip, and nothing that needs an endpoint the API
 * does not have. That constraint is why some obvious-looking indicators are
 * absent: "access denials this week" and "who last changed this role" both
 * need the audit log, which has a schema, a repository and a service but no
 * controller (verified 2026-09-08), so there is no honest way to show them.
 */

export interface DirectorySummary {
  accounts: { total: number; active: number; suspended: number; deactivated: number };
  roles: { total: number; system: number; custom: number };
  catalogue: { permissions: number; resources: number };
  /** Accounts that can still sign in but would see an empty dashboard. */
  accountsWithoutRole: number;
  /** Accounts holding at least one irreversible or review-bypassing action. */
  accountsWithConsequentialAccess: number;
  rolesWithoutUsers: number;
  neverSignedIn: number;
}

export function summariseDirectory(
  users: readonly UserResponse[],
  roles: readonly RoleResponse[],
  permissions: readonly PermissionResponse[],
): DirectorySummary {
  const consequentialPermissionIds = new Set(
    permissions.filter((permission) => isConsequential(permission.action)).map((p) => p._id),
  );
  const consequentialRoleIds = new Set(
    roles
      .filter((role) => role.permissionIds.some((id) => consequentialPermissionIds.has(id)))
      .map((role) => role._id),
  );

  const usage = roleUsage(users, roles);

  return {
    accounts: {
      total: users.length,
      active: countBy(users, (user) => user.accountStatus === "Active"),
      suspended: countBy(users, (user) => user.accountStatus === "Suspended"),
      deactivated: countBy(users, (user) => user.accountStatus === "Deactivated"),
    },
    roles: {
      total: roles.length,
      system: countBy(roles, (role) => role.isSystemRole),
      custom: countBy(roles, (role) => !role.isSystemRole),
    },
    catalogue: {
      permissions: permissions.length,
      resources: new Set(permissions.map((permission) => permission.resourceType)).size,
    },
    // Deliberately excludes deactivated accounts: an account nobody can sign
    // into is not an access gap waiting to be closed.
    accountsWithoutRole: countBy(
      users,
      (user) => user.roleIds.length === 0 && user.accountStatus !== "Deactivated",
    ),
    accountsWithConsequentialAccess: countBy(users, (user) =>
      user.roleIds.some((id) => consequentialRoleIds.has(id)),
    ),
    rolesWithoutUsers: countBy(roles, (role) => (usage.get(role._id) ?? 0) === 0),
    neverSignedIn: countBy(users, (user) => user.lastLogin === null),
  };
}

/**
 * Holders per role, seeded with every role so one nobody holds reads as 0
 * rather than as missing.
 *
 * Ids on a user that match no current role are dropped rather than counted:
 * roles are soft-deleted, so a stale id survives on the user document and
 * would otherwise appear as usage of something that is gone.
 */
export function roleUsage(
  users: readonly UserResponse[],
  roles: readonly RoleResponse[],
): Map<string, number> {
  const counts = new Map<string, number>(roles.map((role) => [role._id, 0]));
  for (const user of users) {
    for (const roleId of user.roleIds) {
      const current = counts.get(roleId);
      if (current !== undefined) {
        counts.set(roleId, current + 1);
      }
    }
  }
  return counts;
}

function countBy<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  return items.reduce((total, item) => (predicate(item) ? total + 1 : total), 0);
}
