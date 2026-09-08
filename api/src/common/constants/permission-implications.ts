import { PERMISSION_CATALOGUE } from './permission-catalogue.js';
import type { PermissionCatalogueEntry } from './permission-catalogue.js';
import type { PermissionResource } from './permission-resources.js';

/**
 * "Whoever may change a resource must be able to read it."
 *
 * Owner decision, 2026-09-08. A role holding `athletes:Delete` and not
 * `athletes:Read` could delete an athlete it could never list — the delete
 * is issued from the screen the read populates, so the grant is incoherent
 * rather than narrower.
 *
 * SCOPE, and why it is not "every action implies Read":
 * thirteen of the catalogue's sixty-four resources carry a write action and
 * NO `Read` permission at all — the twelve singleton content pages, whose
 * read is public and therefore unguarded, and `notifications`, which is
 * write-only by design. There is nothing to imply for those. Minting a
 * `Read` permission to imply would fail `permission-catalogue.spec.ts`,
 * which rejects any pair no `@RequirePermission` guards, and guarding the
 * pages' reads would break the public site.
 *
 * So the rule is applied where it can mean something and is silent where it
 * cannot. `RESOURCES_WITH_READ` is derived from the catalogue rather than
 * listed, so a resource that gains or loses a guarded read is covered
 * without editing this file.
 */
const RESOURCES_WITH_READ: ReadonlySet<PermissionResource> = new Set(
  PERMISSION_CATALOGUE.filter((entry) => entry.action === 'Read').map(
    (entry) => entry.resourceType,
  ),
);

/**
 * The `Read` permissions a grant implies but does not include.
 *
 * @param granted the (resourceType, action) pairs a role is about to hold.
 * @returns one entry per resource still missing its read, alphabetically —
 *   empty when the grant is already coherent. Never throws: a pair naming a
 *   resource the catalogue does not define is ignored rather than guessed
 *   at, so an unknown resource implies nothing at all.
 */
export function missingImpliedReads(
  granted: readonly PermissionCatalogueEntry[],
): PermissionCatalogueEntry[] {
  const held = new Set(granted.map((entry) => `${entry.resourceType}:${entry.action}`));

  const incomplete = new Set<PermissionResource>();
  for (const entry of granted) {
    if (entry.action === 'Read') {
      continue;
    }
    if (!RESOURCES_WITH_READ.has(entry.resourceType)) {
      continue;
    }
    if (held.has(`${entry.resourceType}:Read`)) {
      continue;
    }
    incomplete.add(entry.resourceType);
  }

  return [...incomplete]
    .sort((a, b) => a.localeCompare(b))
    .map((resourceType) => ({ resourceType, action: 'Read' as const }));
}
