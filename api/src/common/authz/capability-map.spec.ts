import { CAPABILITY_MAP, capabilityFor, isSuperAdminOnly } from './capability-map.js';
import { PERMISSION_RESOURCES } from '../constants/permission-resources.js';
import { PERMISSION_ACTIONS } from '../../modules/platform-administration/permissions/schemas/permission.schema.js';

/** The map is the one declaration the catalogue, the role screen and every
 *  grant check derive from, so a mistake in it is a mistake everywhere at once.
 *  These are the invariants that cannot be read off a 78-entry literal by eye. */
describe('CAPABILITY_MAP', () => {
  // An empty or truncated map would make every other assertion here pass, so
  // the floor is asserted before anything else.
  it('declares a realistic number of resources, so an empty map cannot pass', () => {
    expect(CAPABILITY_MAP.length).toBeGreaterThan(60);
  });

  it('covers every resource exactly once', () => {
    const declared = CAPABILITY_MAP.map((entry) => entry.resourceType).sort();

    expect(declared).toEqual([...PERMISSION_RESOURCES].sort());
    expect(new Set(declared).size).toBe(declared.length);
  });

  it('declares no verb outside the vocabulary', () => {
    const unknown = CAPABILITY_MAP.flatMap((entry) =>
      entry.actions.filter((action) => !(PERMISSION_ACTIONS as readonly string[]).includes(action)),
    );

    expect(unknown).toEqual([]);
  });

  /**
   * The other direction of the vocabulary check: not "is every declared verb
   * real" but "is every real verb declared". A verb in `PERMISSION_ACTIONS`
   * that no resource offers is a permission the role screen can hand out and
   * no route reads — the same "looks granted, guards nothing" failure, one
   * level up from a mistyped resource name.
   *
   * A verb here that no resource declares produces no catalogue pair at all, so
   * nothing becomes grantable — which is why the two exceptions below are safe
   * under the owner's rule that no pair may exist without an enforcement path.
   * Each is named rather than counted, with the batch that declares it:
   *
   *  - `ManageSecuritySettings` — the `securitySettings` collection arrives in
   *    Batch 5.
   *  - `ViewSensitive` — field hiding and view logging are A3/A4/C1 in Batch 6a.
   *    It was declared by six resources and enforced by nothing, so it was
   *    removed from them: a grant that changes nothing is the failure this file
   *    exists to prevent.
   *
   * This test is what will refuse to stay green if either collection arrives
   * without its verb being declared alongside the code that reads it.
   */
  it('leaves no verb in the vocabulary that no resource declares', () => {
    const declared = new Set(CAPABILITY_MAP.flatMap((entry) => entry.actions));
    const awaitingTheBatchThatEnforcesIt = ['ManageSecuritySettings', 'ViewSensitive'];

    const orphaned = PERMISSION_ACTIONS.filter(
      (action) => !declared.has(action) && !awaitingTheBatchThatEnforcesIt.includes(action),
    );

    expect(orphaned).toEqual([]);
  });

  it('declares at least one verb per resource, since a resource with none gates nothing', () => {
    const empty = CAPABILITY_MAP.filter((entry) => entry.actions.length === 0).map((e) => e.resourceType);

    expect(empty).toEqual([]);
  });

  it('repeats no verb within a resource', () => {
    const duplicated = CAPABILITY_MAP.filter(
      (entry) => new Set(entry.actions).size !== entry.actions.length,
    ).map((entry) => entry.resourceType);

    expect(duplicated).toEqual([]);
  });

  it('offers PermanentDelete only where the resource is purgeable', () => {
    const wrong = CAPABILITY_MAP.filter(
      (entry) => entry.actions.includes('PermanentDelete') && !entry.purgeable,
    ).map((entry) => entry.resourceType);

    expect(wrong).toEqual([]);
  });

  /** The inverse direction too: `purgeable` with no verb behind it is a column
   *  nobody reads, which is how a policy decision quietly stops applying. */
  it('gives every purgeable resource the verb that purges it', () => {
    const wrong = CAPABILITY_MAP.filter(
      (entry) => entry.purgeable && !entry.actions.includes('PermanentDelete'),
    ).map((entry) => entry.resourceType);

    expect(wrong).toEqual([]);
  });

  /** Chapter 17 §3/§4, owner decision 2026-09-27. Pinned by name rather than by
   *  count: a third purgeable resource is an owner decision, not an edit. */
  it('names exactly the two resources the owner approved for purging', () => {
    const purgeable = CAPABILITY_MAP.filter((entry) => entry.purgeable).map((e) => e.resourceType);

    expect(purgeable.sort()).toEqual(['contactMessages', 'mediaAssets']);
  });

  it('pairs Restore with Archive, never alone', () => {
    const wrong = CAPABILITY_MAP.filter(
      (entry) => entry.actions.includes('Restore') && !entry.actions.includes('Archive'),
    ).map((entry) => entry.resourceType);

    expect(wrong).toEqual([]);
  });

  it('scopes only editorial content (A5)', () => {
    const scoped = CAPABILITY_MAP.filter((entry) => entry.scopes.length > 0).map((e) => e.resourceType);

    expect(scoped.sort()).toEqual(['albums', 'articles', 'heroSlides', 'videos']);
  });

  it('names every superAdminOnly verb among the resource own actions', () => {
    const wrong = CAPABILITY_MAP.flatMap((entry) =>
      entry.superAdminOnly.filter((action) => !entry.actions.includes(action)),
    );

    expect(wrong).toEqual([]);
  });

  /**
   * Independent review, round 4 (I5, second half): `readVerb` was free-form
   * and unvalidated — a typo (`'ViewAuditlog'` for `'ViewAuditLog'`) would
   * silently turn `missingImpliedReads`'s coherence rule OFF for that
   * resource, with every existing test still green, because `readVerbFor`
   * falls back to `'Read'` for anything it does not recognise as the
   * resource's own verb. A rule meant to fail loud on an incoherent role
   * must not itself fail silent on a typo.
   */
  it('declares no readVerb outside the resource own actions', () => {
    const wrong = CAPABILITY_MAP.filter(
      (entry) => entry.readVerb !== undefined && !entry.actions.includes(entry.readVerb),
    ).map((entry) => `${entry.resourceType}:${entry.readVerb}`);

    expect(wrong).toEqual([]);
  });

  /** Eleven pairs are decided reserved to the Super Admin; ten are declarable
   *  today. The eleventh, `securitySettings:ManageSecuritySettings`, cannot
   *  be declared because `securitySettings` is not in `PERMISSION_RESOURCES`
   *  yet — it arrives in Batch 5, and is expected to make this test fail
   *  when it lands, which is the reminder that it must be reserved and not
   *  merely added. `users:Archive` and `users:Restore` joined the other
   *  eight on 2026-09-28: an independent review found both routes guarded by
   *  pairs the map left grantable, returning account data that the reserved
   *  `users:Read` exists to protect. The list is pinned by name, not by
   *  count, so it stays a decision record. See ADR-0104. */
  it('reserves exactly the pairs Decision 4 names, and no others', () => {
    const reserved = CAPABILITY_MAP.flatMap((entry) =>
      entry.superAdminOnly.map((action) => `${entry.resourceType}:${action}`),
    );

    expect(reserved.sort()).toEqual([
      'permissions:Read',
      'roles:ManageRoles',
      'roles:Read',
      'users:Archive',
      'users:AssignRoles',
      'users:Create',
      'users:Export',
      'users:Read',
      'users:Restore',
      'users:Update',
    ]);
  });

  it('answers for a known resource and not for an unknown one', () => {
    expect(capabilityFor('users')?.group).toBe('platform-administration');
    expect(capabilityFor('notAResource')).toBeUndefined();
  });

  it('reports a reserved pair as reserved and an ordinary one as not', () => {
    expect(isSuperAdminOnly('users', 'AssignRoles')).toBe(true);
    expect(isSuperAdminOnly('articles', 'Update')).toBe(false);
    // An unknown resource must answer false rather than throw: the grant check
    // calls this before it knows the resource is real.
    expect(isSuperAdminOnly('notAResource', 'Read')).toBe(false);
  });

  /** Owner decision 2026-09-27. The catalogue is code and the seed is its only
   *  writer, so a runtime-minted permission row could only ever gate nothing. */
  it('declares no Create pair for permissions', () => {
    expect(capabilityFor('permissions')?.actions).toEqual(['Read']);
  });

  /**
   * Asserted on the source rather than by calling the route, because the point
   * is that the route does not exist at all — a 403 would still be a door.
   */
  it('exposes no way to create a permission through the API', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');

    const controller = readFileSync(
      join(process.cwd(), 'src/modules/platform-administration/permissions/permissions.controller.ts'),
      'utf8',
    );

    expect(controller).not.toMatch(/@(Post|Put|Patch|Delete)\(/);
  });
});
