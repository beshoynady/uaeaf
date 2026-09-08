import { describe, expect, it } from "vitest";
import { canAccessResource, hasPermission } from "./permissions";

const grants = [
  { resourceType: "users", action: "Read" },
  { resourceType: "users", action: "Update" },
  { resourceType: "roles", action: "Read" },
];

describe("hasPermission", () => {
  it("matches an exact resource + action pair", () => {
    expect(hasPermission(grants, "users", "Update")).toBe(true);
  });

  it("does not match the right resource with the wrong action", () => {
    expect(hasPermission(grants, "users", "Delete")).toBe(false);
  });

  it("does not match the right action on the wrong resource", () => {
    expect(hasPermission(grants, "roles", "Update")).toBe(false);
  });

  it("is false for an empty grant list", () => {
    expect(hasPermission([], "users", "Read")).toBe(false);
  });
});

describe("canAccessResource", () => {
  it("is true when the user holds any action on the resource", () => {
    expect(canAccessResource(grants, "roles")).toBe(true);
  });

  it("is false when the user holds no action on the resource", () => {
    expect(canAccessResource(grants, "permissions")).toBe(false);
  });
});
