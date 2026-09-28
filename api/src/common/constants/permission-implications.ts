import { PERMISSION_CATALOGUE } from './permission-catalogue.js';
import type { PermissionCatalogueEntry } from './permission-catalogue.js';
import type { PermissionResource } from './permission-resources.js';
import { capabilityFor, isSuperAdminOnly } from '../authz/capability-map.js';
import type { PermissionAction } from '../../modules/platform-administration/permissions/schemas/permission.schema.js';

/**
 * "Whoever may change a resource must be able to read it."
 *
 * Owner decision, 2026-09-08. A role holding `athletes:Archive` and not
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
 *
 * The rule keys on each resource's OWN read verb, not the literal string
 * `Read` (owner decision 2026-09-27, B3): `auditLogs` declares `ViewAuditLog`
 * instead, because reading the record of who touched a thing is not the same
 * act as reading the thing. Keying on the literal `Read` left `auditLogs`
 * with no `Read` pair to find, so `auditLogs:Export` implied nothing and a
 * role could hold the CSV without the screen it exports from — exactly the
 * incoherence this rule exists to refuse. `readVerbFor` reads the verb off
 * `CAPABILITY_MAP` rather than naming `auditLogs` here, so the exception
 * lives in one place.
 */
const readVerbFor = (resourceType: PermissionResource): PermissionAction =>
  capabilityFor(resourceType)?.readVerb ?? 'Read';

const RESOURCES_WITH_READ: ReadonlySet<PermissionResource> = new Set(
  PERMISSION_CATALOGUE.filter((entry) => entry.action === readVerbFor(entry.resourceType)).map(
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
 *
 * SILENT ON A RESERVED READ VERB (independent review, round 4, I7). Without
 * this, a role built with a non-reserved action whose implied read IS
 * reserved was told to add that read (`400 impliedReadMissing`), and adding
 * it was itself refused (`403 ungrantableCapability`): the exact
 * unfollowable-advice shape fix round 1 removed from the assign path,
 * reappearing here on the build path. The rule's own reason — "whoever may
 * change a resource must be able to read it" — is not violated by staying
 * silent here: nobody CAN hold the reserved read either, so demanding it
 * adds nothing a real coherence check would catch. `users:Archive`/`Restore`
 * were the case this closed for; both joined the reserved set outright on
 * 2026-09-28 (ADR-0104), so this branch is unexercised by any resource
 * today — kept for the next resource shaped the same way.
 */
export const missingImpliedReads = (
  granted: readonly PermissionCatalogueEntry[],
): PermissionCatalogueEntry[] => {
  const held = new Set(granted.map((entry) => `${entry.resourceType}:${entry.action}`));

  const incomplete = new Set<PermissionResource>();
  for (const entry of granted) {
    const readVerb = readVerbFor(entry.resourceType);
    if (entry.action === readVerb) {
      continue;
    }
    if (!RESOURCES_WITH_READ.has(entry.resourceType)) {
      continue;
    }
    if (isSuperAdminOnly(entry.resourceType, readVerb)) {
      continue;
    }
    if (held.has(`${entry.resourceType}:${readVerb}`)) {
      continue;
    }
    incomplete.add(entry.resourceType);
  }

  return [...incomplete]
    .sort((a, b) => a.localeCompare(b))
    .map((resourceType) => ({ resourceType, action: readVerbFor(resourceType) }));
};
