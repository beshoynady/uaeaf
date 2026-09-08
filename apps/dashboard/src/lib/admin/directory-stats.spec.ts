import { describe, expect, it } from "vitest";
import type { PermissionResponse, RoleResponse, UserResponse } from "@/lib/api/types";
import { summariseDirectory, roleUsage } from "./directory-stats";

const PERMISSIONS: PermissionResponse[] = [
  { _id: "p-read", name: { en: "Read users", ar: "" }, resourceType: "users", action: "Read" },
  { _id: "p-create", name: { en: "Create users", ar: "" }, resourceType: "users", action: "Create" },
  { _id: "p-delete", name: { en: "Delete roles", ar: "" }, resourceType: "roles", action: "Delete" },
];

const ROLES: RoleResponse[] = [
  {
    _id: "r-admin",
    name: { en: "Admin", ar: "" },
    description: null,
    permissionIds: ["p-read", "p-delete"],
    isSystemRole: true,
  },
  {
    _id: "r-editor",
    name: { en: "Editor", ar: "" },
    description: null,
    permissionIds: ["p-read"],
    isSystemRole: false,
  },
  {
    _id: "r-idle",
    name: { en: "Idle", ar: "" },
    description: null,
    permissionIds: [],
    isSystemRole: false,
  },
];

function user(id: string, over: Partial<UserResponse> = {}): UserResponse {
  return {
    id,
    name: { en: id, ar: id },
    email: `${id}@uaeaf.ae`,
    roleIds: [],
    personId: null,
    accountStatus: "Active",
    lastLogin: null,
    photoId: null,
    preferredLanguage: null,
    preferredTheme: null,
    ...over,
  };
}

const USERS: UserResponse[] = [
  user("a", { roleIds: ["r-admin"], lastLogin: "2026-09-07T10:00:00.000Z" }),
  user("b", { roleIds: ["r-editor"], lastLogin: "2026-09-06T10:00:00.000Z" }),
  user("c", { roleIds: ["r-editor"], accountStatus: "Suspended" }),
  user("d", { roleIds: [] }),
  user("e", { roleIds: [], accountStatus: "Deactivated" }),
];

describe("summariseDirectory", () => {
  const summary = summariseDirectory(USERS, ROLES, PERMISSIONS);

  it("separates the three account states the API actually stores", () => {
    // Three, not two: `Deactivated` is a closed account and `Suspended` is a
    // live one being held. Merging them hides the difference between "gone"
    // and "under review".
    expect(summary.accounts).toEqual({ total: 5, active: 3, suspended: 1, deactivated: 1 });
  });

  it("counts accounts that can sign in and then see nothing", () => {
    // Excludes the deactivated one — an account nobody can sign into is not
    // a loose end anyone needs to chase.
    expect(summary.accountsWithoutRole).toBe(1);
  });

  it("counts accounts holding an irreversible action", () => {
    expect(summary.accountsWithConsequentialAccess).toBe(1);
  });

  it("counts roles nobody holds", () => {
    expect(summary.rolesWithoutUsers).toBe(1);
  });

  it("separates system roles from the ones an administrator may edit", () => {
    expect(summary.roles).toEqual({ total: 3, system: 1, custom: 2 });
  });

  it("reports the catalogue as pairs over resources, the way it is derived", () => {
    expect(summary.catalogue).toEqual({ permissions: 3, resources: 2 });
  });

  it("counts accounts that have never signed in", () => {
    expect(summary.neverSignedIn).toBe(3);
  });

  it("survives an empty platform without dividing by nothing", () => {
    expect(summariseDirectory([], [], [])).toMatchObject({
      accounts: { total: 0, active: 0, suspended: 0, deactivated: 0 },
      rolesWithoutUsers: 0,
      accountsWithoutRole: 0,
    });
  });
});

describe("roleUsage", () => {
  it("counts holders per role, including the roles nobody holds", () => {
    const usage = roleUsage(USERS, ROLES);
    expect(usage.get("r-admin")).toBe(1);
    expect(usage.get("r-editor")).toBe(2);
    expect(usage.get("r-idle")).toBe(0);
  });

  it("ignores a role id on a user that no longer exists", () => {
    // Roles are soft-deleted, so a stale id survives on the user document.
    // Counting it would report usage of something that is gone.
    const usage = roleUsage([user("z", { roleIds: ["r-ghost"] })], ROLES);
    expect(usage.has("r-ghost")).toBe(false);
    expect(usage.get("r-admin")).toBe(0);
  });
});
