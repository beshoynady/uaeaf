import { describe, expect, it } from "vitest";
import type { PermissionResponse } from "@/lib/api/types";
import {
  ACTION_ORDER,
  buildMatrix,
  canCheck,
  diffSelection,
  filterRows,
  incoherentSelections,
  isConsequential,
  selectionBlockers,
  toggleSelection,
  toggleWithImpliedRead,
  visibleActions,
} from "./permission-matrix";

function permission(resourceType: string, action: string, id = `${resourceType}:${action}`): PermissionResponse {
  return { _id: id, name: { en: `${action} ${resourceType}`, ar: `${action} — ${resourceType}` }, resourceType, action };
}

const CATALOGUE: PermissionResponse[] = [
  permission("users", "Read"),
  permission("users", "Create"),
  permission("roles", "Read"),
  permission("roles", "Delete"),
  permission("albums", "Publish"),
];

describe("ACTION_ORDER", () => {
  it("mirrors PERMISSION_ACTIONS in the API's own order", () => {
    // api/src/.../permission.schema.ts. The column order is the API's, not a
    // preference — a reader comparing the screen to the catalogue should not
    // have to re-sort in their head.
    expect(ACTION_ORDER).toEqual([
      "Create",
      "Read",
      "Update",
      "Delete",
      "HardDelete",
      "Approve",
      "Publish",
      "EditProtectedData",
      "Export",
    ]);
  });
});

describe("visibleActions", () => {
  it("drops a column the catalogue never fills", () => {
    // `HardDelete` and `EditProtectedData` are declared actions that guard
    // no route, so every one of the sixty-four rows renders an em dash
    // under them — 128 cells of pure noise in a table already carrying 165
    // real checkboxes.
    const rows = buildMatrix(CATALOGUE, new Set(), []);

    expect(visibleActions(rows)).toEqual(["Create", "Read", "Delete", "Publish"]);
  });

  it("keeps the API's own column order", () => {
    const rows = buildMatrix(
      [permission("x", "Export"), permission("x", "Create")],
      new Set(),
      [],
    );

    expect(visibleActions(rows)).toEqual(["Create", "Export"]);
  });
});

describe("toggleWithImpliedRead", () => {
  // Everything grantable, so only the implication rule shapes the result.
  const HOLDS_ALL = CATALOGUE.map((p) => ({ resourceType: p.resourceType, action: p.action }));
  const rows = () => buildMatrix(CATALOGUE, new Set(), HOLDS_ALL);

  it("ticks the read a write action implies, and says it did", () => {
    // The API refuses the incoherent set outright (`impliedReadMissing`).
    // Ticking it here, visibly, is what keeps the screen honest: the
    // administrator sees the grant they are actually making.
    const result = toggleWithImpliedRead(rows(), new Set(), "roles:Delete");

    expect([...result.next].sort()).toEqual(["roles:Delete", "roles:Read"]);
    expect(result.autoAdded).toEqual(["roles:Read"]);
  });

  it("adds nothing extra when the read is already ticked", () => {
    const result = toggleWithImpliedRead(rows(), new Set(["roles:Read"]), "roles:Delete");

    expect(result.autoAdded).toEqual([]);
    expect([...result.next].sort()).toEqual(["roles:Delete", "roles:Read"]);
  });

  it("implies nothing from Read itself", () => {
    const result = toggleWithImpliedRead(rows(), new Set(), "users:Read");

    expect([...result.next]).toEqual(["users:Read"]);
    expect(result.autoAdded).toEqual([]);
  });

  it("leaves the read in place when the write is unticked", () => {
    // Unticking Delete is not a decision to stop reading. Withdrawing the
    // read as well would silently take away a grant nobody asked to remove.
    const result = toggleWithImpliedRead(
      rows(),
      new Set(["roles:Delete", "roles:Read"]),
      "roles:Delete",
    );

    expect([...result.next]).toEqual(["roles:Read"]);
    expect(result.autoAdded).toEqual([]);
  });

  it("implies nothing for a resource the catalogue gives no read", () => {
    // The twelve singleton pages and `notifications` have a write action and
    // no guarded read at all.
    const pageRows = buildMatrix([permission("newsPage", "Update")], new Set(), [
      { resourceType: "newsPage", action: "Update" },
    ]);

    const result = toggleWithImpliedRead(pageRows, new Set(), "newsPage:Update");

    expect([...result.next]).toEqual(["newsPage:Update"]);
    expect(result.autoAdded).toEqual([]);
  });

  it("refuses to auto-tick a read the actor cannot grant", () => {
    // Ticking it would make the whole save fail with `ungrantablePermission`
    // — naming a permission the administrator never chose. Better to leave
    // it off and let `selectionBlockers` explain.
    const partial = buildMatrix(CATALOGUE, new Set(), [
      { resourceType: "roles", action: "Delete" },
    ]);

    const result = toggleWithImpliedRead(partial, new Set(), "roles:Delete");

    expect([...result.next]).toEqual(["roles:Delete"]);
    expect(result.autoAdded).toEqual([]);
  });
});

describe("incoherentSelections", () => {
  const HOLDS_ALL = CATALOGUE.map((p) => ({ resourceType: p.resourceType, action: p.action }));

  it("names a resource that may be written but not read", () => {
    const rows = buildMatrix(CATALOGUE, new Set(["roles:Delete"]), HOLDS_ALL);

    expect(incoherentSelections(rows, new Set(["roles:Delete"]))).toEqual([
      { resourceType: "roles", action: "Read" },
    ]);
  });

  it("is empty once the read is selected", () => {
    const rows = buildMatrix(CATALOGUE, new Set(), HOLDS_ALL);

    expect(incoherentSelections(rows, new Set(["roles:Delete", "roles:Read"]))).toEqual([]);
  });
});

describe("isConsequential", () => {
  it.each(["Delete", "HardDelete", "Approve", "Publish", "EditProtectedData"])(
    "marks %s as consequential",
    (action) => {
      expect(isConsequential(action)).toBe(true);
    },
  );

  it.each(["Create", "Read", "Update"])("leaves %s ordinary", (action) => {
    expect(isConsequential(action)).toBe(false);
  });
});

describe("buildMatrix", () => {
  it("gives one row per resource, ordered so the list is scannable", () => {
    const rows = buildMatrix(CATALOGUE, new Set(), []);
    expect(rows.map((row) => row.resourceType)).toEqual(["albums", "roles", "users"]);
  });

  it("leaves a pair the catalogue does not define as absent, not as unchecked", () => {
    // The difference is the whole point: an unchecked box invites a click
    // that would create a permission guarding nothing.
    const [albums] = buildMatrix(CATALOGUE, new Set(), []);
    expect(albums.cells.Publish?.permissionId).toBe("albums:Publish");
    expect(albums.cells.Delete).toBeUndefined();
  });

  it("marks the role's current grants as checked", () => {
    const rows = buildMatrix(CATALOGUE, new Set(["users:Read"]), []);
    const users = rows.find((row) => row.resourceType === "users");
    expect(users?.cells.Read?.granted).toBe(true);
    expect(users?.cells.Create?.granted).toBe(false);
  });

  it("locks a permission the actor does not hold themselves", () => {
    // RolesService refuses to let anyone grant what they do not hold
    // (auth-security-audit-2026-09-05 P0 #2). Rendering those boxes as
    // editable would mean the form is refused after the click, with no
    // explanation of which box caused it.
    const rows = buildMatrix(CATALOGUE, new Set(), [{ resourceType: "users", action: "Read" }]);
    const users = rows.find((row) => row.resourceType === "users");
    expect(users?.cells.Read?.grantable).toBe(true);
    expect(users?.cells.Create?.grantable).toBe(false);
  });

  it("keeps an already-granted permission visible even when the actor cannot grant it", () => {
    // Hiding it would misrepresent the role. It stays checked and locked, so
    // the reader sees the truth and cannot silently strip it.
    const rows = buildMatrix(CATALOGUE, new Set(["roles:Delete"]), []);
    const roles = rows.find((row) => row.resourceType === "roles");
    expect(roles?.cells.Delete).toMatchObject({ granted: true, grantable: false });
  });

  it("counts what each row grants against what it could", () => {
    const rows = buildMatrix(CATALOGUE, new Set(["users:Read"]), []);
    const users = rows.find((row) => row.resourceType === "users");
    expect(users?.grantedCount).toBe(1);
    expect(users?.availableCount).toBe(2);
  });
});

describe("canCheck", () => {
  it("allows ticking a box the actor holds", () => {
    expect(canCheck({ permissionId: "x", granted: false, grantable: true })).toBe(true);
  });

  it("refuses to tick one the actor does not hold", () => {
    expect(canCheck({ permissionId: "x", granted: false, grantable: false })).toBe(false);
  });

  it("still allows UNticking a granted permission the actor does not hold", () => {
    // Removal is always permitted: RolesService validates the submitted list,
    // so taking a permission out can only move the request towards being
    // accepted. Locking the box shut would leave the role uneditable with no
    // way out.
    expect(canCheck({ permissionId: "x", granted: true, grantable: false })).toBe(true);
  });
});

describe("selectionBlockers", () => {
  const rows = buildMatrix(CATALOGUE, new Set(["roles:Delete", "users:Read"]), [
    { resourceType: "users", action: "Read" },
  ]);

  it("names every selected permission the actor does not hold", () => {
    // assertGrantable iterates the WHOLE submitted list, not just the
    // additions (roles.service.ts:143-156), so a role that retains one
    // permission the actor lacks cannot be saved at all. Detecting it here
    // is the difference between an explanation and a 403 whose message does
    // not say which permission caused it.
    expect(selectionBlockers(rows, new Set(["roles:Delete", "users:Read"]))).toEqual([
      { resourceType: "roles", action: "Delete" },
    ]);
  });

  it("clears once the un-held permission is removed", () => {
    expect(selectionBlockers(rows, new Set(["users:Read"]))).toEqual([]);
  });

  it("is empty for an actor who holds everything selected", () => {
    const full = buildMatrix(CATALOGUE, new Set(["users:Read"]), [
      { resourceType: "users", action: "Read" },
    ]);
    expect(selectionBlockers(full, new Set(["users:Read"]))).toEqual([]);
  });
});

describe("toggleSelection", () => {
  it("adds and removes without mutating the set it was given", () => {
    const original = new Set(["a"]);
    const added = toggleSelection(original, "b");
    expect([...added].sort()).toEqual(["a", "b"]);
    expect([...original]).toEqual(["a"]);

    expect([...toggleSelection(added, "a")]).toEqual(["b"]);
  });
});

describe("diffSelection", () => {
  it("reports nothing for an untouched selection", () => {
    const diff = diffSelection(new Set(["a", "b"]), new Set(["b", "a"]));
    expect(diff).toEqual({ added: [], removed: [], changed: false });
  });

  it("names what was added and what was withdrawn", () => {
    const diff = diffSelection(new Set(["a", "b"]), new Set(["b", "c"]));
    expect(diff.added).toEqual(["c"]);
    expect(diff.removed).toEqual(["a"]);
    expect(diff.changed).toBe(true);
  });
});

describe("filterRows", () => {
  const rows = buildMatrix(CATALOGUE, new Set(["users:Read"]), []);

  it("returns everything for an empty query", () => {
    expect(filterRows(rows, "", "all")).toHaveLength(3);
  });

  it("matches the resource identifier case-insensitively", () => {
    expect(filterRows(rows, "USER", "all").map((row) => row.resourceType)).toEqual(["users"]);
  });

  it("trims, so a stray space does not empty the table", () => {
    expect(filterRows(rows, "  roles  ", "all").map((row) => row.resourceType)).toEqual(["roles"]);
  });

  it("narrows to rows that actually grant something", () => {
    expect(filterRows(rows, "", "granted").map((row) => row.resourceType)).toEqual(["users"]);
  });

  it("combines the query and the filter rather than letting one win", () => {
    expect(filterRows(rows, "roles", "granted")).toEqual([]);
  });
});
