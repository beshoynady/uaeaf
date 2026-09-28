import type { PermissionResponse } from "@/lib/api/types";
import type { PermissionGrant } from "@/lib/auth/permissions";

/**
 * The role editor's data model, kept pure so the screen is a rendering of it
 * rather than the place the rules live.
 *
 * Two facts about the API shape the whole thing:
 *
 * 1. **Not every (resource, action) pair exists.** The catalogue is derived
 *    from the `@RequirePermission` decorators actually present in the code —
 *    164 real pairs, not 63 x 8 = 504. A pair with no permission row must
 *    render as absent, never as an unchecked box: an unchecked box invites a
 *    click that would ask for a permission guarding no route.
 *
 * 2. **You cannot grant what you do not hold.** `RolesService.assertGrantable`
 *    enforces this server-side (auth-security-audit-2026-09-05 P0 #2), and
 *    it iterates the **entire submitted list**, not just the additions
 *    (roles.service.ts:143-156). Two consequences the screen has to respect:
 *
 *    - A box the actor does not hold cannot be ticked (`grantable: false`).
 *    - A box already ticked that the actor does not hold makes the whole
 *      save impossible until it is unticked — so unticking must stay
 *      available even on a cell that could never be ticked again, and the
 *      screen must say so up front. The API's own refusal is a 403 reading
 *      "Cannot grant a permission you do not already hold yourself.", which
 *      names no permission; `selectionBlockers` is what turns that into
 *      something actionable.
 */

/**
 * `PERMISSION_ACTIONS` (api/src/.../permissions/schemas/permission.schema.ts),
 * verb for verb and in the API's own order, so the screen and the catalogue
 * read the same way.
 *
 * Restated here rather than imported because that module constructs a Mongoose
 * schema at load time, and this one is pulled into four `"use client"`
 * components — importing it would put `@nestjs/mongoose` and `mongoose` in the
 * browser bundle. `permission-matrix.spec.ts` imports the API's list and
 * asserts exact equality, so the two cannot drift silently.
 *
 * A verb missing from this list is not a missing column: `visibleActions`
 * drops it, no checkbox is rendered, and every pair guarded by it becomes
 * ungrantable from the only screen that grants anything.
 */
export const ACTION_ORDER = [
  "Read",
  "Create",
  "Update",
  "Archive",
  "Restore",
  "PermanentDelete",
  "Export",
  "Print",
  "ViewSensitive",
  "Publish",
  "Approve",
  "ViewReports",
  "ManageRoles",
  "AssignRoles",
  "ViewAuditLog",
  "ManageSecuritySettings",
] as const;

export type PermissionAction = (typeof ACTION_ORDER)[number];

/**
 * Actions whose grant is a different kind of decision: they destroy content,
 * bypass review, or expose protected personal data. Grouped so the screen can
 * say which ones a role carries without the reader auditing 164 boxes.
 *
 * Deliberately derived from the action's own meaning, not from a per-resource
 * judgement — `Archive` on `albums` is as consequential as on `athletes`.
 *
 * The same five as before ADR-0103 renamed the verbs, carried across one for
 * one: `Delete` is now `Archive`, `HardDelete` is now `PermanentDelete`, and
 * `EditProtectedData` is now `ViewSensitive`. `Restore`, `Export`, `Print` and
 * `ViewReports` are left out, as `Export` was before the rename.
 */
const CONSEQUENTIAL: ReadonlySet<string> = new Set([
  "Archive",
  "PermanentDelete",
  "Approve",
  "Publish",
  "ViewSensitive",
]);

export const isConsequential = (action: string): boolean => {
  return CONSEQUENTIAL.has(action);
};

export interface MatrixCell {
  permissionId: string;
  granted: boolean;
  /** False when the signed-in administrator does not hold this permission,
   *  so the API would refuse to let them hand it out. */
  grantable: boolean;
}

export interface MatrixRow {
  resourceType: string;
  /** Keyed by action. A missing key means the catalogue defines no such
   *  permission — render an em dash, not an empty checkbox. */
  cells: Partial<Record<PermissionAction, MatrixCell>>;
  grantedCount: number;
  /** How many permissions exist at all for this resource. */
  availableCount: number;
  /** True when any granted or grantable cell is a consequential action. */
  hasConsequential: boolean;
}

export const buildMatrix = (
  catalogue: readonly PermissionResponse[],
  selected: ReadonlySet<string>,
  actorGrants: readonly PermissionGrant[],
): MatrixRow[] => {
  const held = new Set(actorGrants.map((grant) => `${grant.resourceType}:${grant.action}`));
  const byResource = new Map<string, MatrixRow>();

  for (const permission of catalogue) {
    if (!isKnownAction(permission.action)) {
      // A row whose action is outside the API's own enum cannot be rendered
      // in a fixed-column matrix. Skipping is safer than inventing a column:
      // the permission still exists and still guards its route.
      continue;
    }

    const row =
      byResource.get(permission.resourceType) ??
      {
        resourceType: permission.resourceType,
        cells: {},
        grantedCount: 0,
        availableCount: 0,
        hasConsequential: false,
      };

    const granted = selected.has(permission.id);
    row.cells[permission.action] = {
      permissionId: permission.id,
      granted,
      grantable: held.has(`${permission.resourceType}:${permission.action}`),
    };
    row.availableCount += 1;
    if (granted) {
      row.grantedCount += 1;
    }
    if (isConsequential(permission.action)) {
      row.hasConsequential = true;
    }

    byResource.set(permission.resourceType, row);
  }

  // Alphabetical by the resource identifier, which is the name the API uses
  // and the only label guaranteed to exist in both languages.
  return [...byResource.values()].sort((a, b) => a.resourceType.localeCompare(b.resourceType));
};

/**
 * Whether this checkbox may be interacted with right now.
 *
 * Asymmetric on purpose: ticking asks the API to grant, unticking asks it to
 * stop granting. Only the first needs the actor to hold the permission.
 */
export const canCheck = (cell: MatrixCell): boolean => {
  return cell.grantable || cell.granted;
};

/**
 * Selected permissions the actor does not hold — i.e. the exact reason a save
 * would be refused, expressed as pairs the screen can name.
 */
export const selectionBlockers = (
  rows: readonly MatrixRow[],
  selected: ReadonlySet<string>,
): PermissionGrant[] => {
  const blockers: PermissionGrant[] = [];
  for (const row of rows) {
    for (const [action, cell] of Object.entries(row.cells)) {
      if (cell && !cell.grantable && selected.has(cell.permissionId)) {
        blockers.push({ resourceType: row.resourceType, action });
      }
    }
  }
  return blockers;
};

export const toggleSelection = (
  selected: ReadonlySet<string>,
  permissionId: string,
): Set<string> => {
  const next = new Set(selected);
  if (!next.delete(permissionId)) {
    next.add(permissionId);
  }
  return next;
};

/**
 * Only the columns the catalogue actually fills, in the API's order.
 *
 * `ViewSensitive` is a declared action with no pair in the catalogue at all,
 * so rendering every column unconditionally puts an em dash in one column of
 * every row of a table already carrying hundreds of real checkboxes. A column
 * that is empty for every row tells the reader nothing except that it is
 * empty.
 */
export const visibleActions = (rows: readonly MatrixRow[]): PermissionAction[] => {
  return ACTION_ORDER.filter((action) => rows.some((row) => row.cells[action] !== undefined));
};

export interface ImpliedToggle {
  next: Set<string>;
  /** Permission ids the toggle added on the caller's behalf, so the screen
   *  can say so rather than changing the grant silently. */
  autoAdded: string[];
}

/**
 * Ticking a write action ticks the resource's read with it — visibly.
 *
 * The API refuses the incoherent set outright (`impliedReadMissing`, owner
 * decision 2026-09-08), so the alternative to doing this is a save that
 * fails on a rule the screen never showed. Doing it here, and reporting it
 * in `autoAdded`, is what keeps the grant the administrator sees identical
 * to the grant that gets stored.
 *
 * Three deliberate asymmetries:
 *
 *  - **Unticking implies nothing.** Withdrawing `Delete` is not a decision
 *    to stop reading, and silently removing the read would take away a
 *    grant nobody asked to remove.
 *  - **A resource with no read cell is left alone.** Thirteen resources have
 *    a write action and no guarded read at all — the twelve singleton pages
 *    and `notifications`. There is nothing to imply.
 *  - **An ungrantable read is not ticked.** Ticking a permission the actor
 *    does not hold would fail the whole save with `ungrantablePermission`,
 *    naming a permission they never chose. Leaving it off lets
 *    `incoherentSelections` explain the real problem instead.
 */
export const toggleWithImpliedRead = (
  rows: readonly MatrixRow[],
  selected: ReadonlySet<string>,
  permissionId: string,
): ImpliedToggle => {
  const next = toggleSelection(selected, permissionId);
  if (!next.has(permissionId)) {
    return { next, autoAdded: [] };
  }

  const location = locate(rows, permissionId);
  if (!location || location.action === "Read") {
    return { next, autoAdded: [] };
  }

  const read = location.row.cells.Read;
  if (!read || next.has(read.permissionId) || !canCheck(read)) {
    return { next, autoAdded: [] };
  }

  next.add(read.permissionId);
  return { next, autoAdded: [read.permissionId] };
};

/**
 * Resources the selection may write but not read — the exact set the API
 * would refuse with `impliedReadMissing`.
 *
 * Sibling of `selectionBlockers`, and the same shape, because both answer
 * "why would this save be rejected, in terms the screen can name".
 */
export const incoherentSelections = (
  rows: readonly MatrixRow[],
  selected: ReadonlySet<string>,
): PermissionGrant[] => {
  const incomplete: PermissionGrant[] = [];
  for (const row of rows) {
    const read = row.cells.Read;
    if (!read || selected.has(read.permissionId)) {
      continue;
    }
    const writesSelected = Object.entries(row.cells).some(
      ([action, cell]) => action !== "Read" && cell && selected.has(cell.permissionId),
    );
    if (writesSelected) {
      incomplete.push({ resourceType: row.resourceType, action: "Read" });
    }
  }
  return incomplete;
};

/** Which row and action a permission id sits at. */
const locate = (
  rows: readonly MatrixRow[],
  permissionId: string,
): { row: MatrixRow; action: PermissionAction } | null => {
  for (const row of rows) {
    for (const action of ACTION_ORDER) {
      if (row.cells[action]?.permissionId === permissionId) {
        return { row, action };
      }
    }
  }
  return null;
};

export interface SelectionDiff {
  added: string[];
  removed: string[];
  changed: boolean;
}

/** What the save button would send, and what the reader is told it will do. */
export const diffSelection = (
  original: ReadonlySet<string>,
  current: ReadonlySet<string>,
): SelectionDiff => {
  const added = [...current].filter((id) => !original.has(id)).sort();
  const removed = [...original].filter((id) => !current.has(id)).sort();
  return { added, removed, changed: added.length > 0 || removed.length > 0 };
};

export type RowFilter = "all" | "granted";

export const filterRows = (
  rows: readonly MatrixRow[],
  query: string,
  filter: RowFilter,
): MatrixRow[] => {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter === "granted" && row.grantedCount === 0) {
      return false;
    }
    return needle.length === 0 || row.resourceType.toLowerCase().includes(needle);
  });
};

const isKnownAction = (action: string): action is PermissionAction => {
  return (ACTION_ORDER as readonly string[]).includes(action);
};
