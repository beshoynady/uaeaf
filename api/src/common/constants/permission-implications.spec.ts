import { missingImpliedReads } from './permission-implications.js';
import type { PermissionCatalogueEntry } from './permission-catalogue.js';

/**
 * The rule the owner approved 2026-09-08: a role that may change a resource
 * must also be able to read it. Acting blind is not a narrower grant, it is
 * an incoherent one — the screen that lists what you may delete is the same
 * screen the delete is issued from.
 *
 * The rule is deliberately NOT "every action implies Read everywhere":
 * thirteen resources in `PERMISSION_CATALOGUE` carry a write action and no
 * `Read` permission at all, because their read is public (the twelve
 * singleton pages) or they are write-only by design (`notifications`).
 * There is nothing to imply there, and inventing a permission to imply
 * would fail `permission-catalogue.spec.ts`, which refuses any pair no
 * `@RequirePermission` guards.
 */
describe('missingImpliedReads', () => {
  const pair = (resourceType: string, action: string): PermissionCatalogueEntry =>
    ({ resourceType, action }) as PermissionCatalogueEntry;

  it('reports the Read a write action leaves out', () => {
    expect(missingImpliedReads([pair('athletes', 'Archive')])).toEqual([
      pair('athletes', 'Read'),
    ]);
  });

  it('reports nothing when the Read is already granted', () => {
    expect(
      missingImpliedReads([pair('athletes', 'Archive'), pair('athletes', 'Read')]),
    ).toEqual([]);
  });

  it('treats Read on its own as complete', () => {
    expect(missingImpliedReads([pair('permissions', 'Read')])).toEqual([]);
  });

  it('names each resource once however many write actions it carries', () => {
    expect(
      missingImpliedReads([
        pair('athletes', 'Create'),
        pair('athletes', 'Update'),
        pair('athletes', 'Archive'),
      ]),
    ).toEqual([pair('athletes', 'Read')]);
  });

  it('stays silent on a resource the catalogue gives no Read permission', () => {
    // `newsPage` is a singleton content page: the public site reads it
    // unauthenticated, so only `Update` is guarded. There is no
    // `newsPage:Read` to imply.
    expect(missingImpliedReads([pair('newsPage', 'Update')])).toEqual([]);
  });

  it('stays silent on a write-only resource', () => {
    expect(missingImpliedReads([pair('notifications', 'Create')])).toEqual([]);
  });

  it('reports every incomplete resource, alphabetically', () => {
    expect(
      missingImpliedReads([pair('venues', 'Create'), pair('clubs', 'Archive')]),
    ).toEqual([pair('clubs', 'Read'), pair('venues', 'Read')]);
  });

  /**
   * B3 (owner decision 2026-09-27): `auditLogs` declares `ViewAuditLog`
   * rather than `Read`, so the rule must key on each resource's own read
   * verb — keying on the literal `Read` found no such pair on `auditLogs`
   * and let `Export` through with nothing implied, which would let a role
   * hold the audit-log CSV without the screen it exports from.
   */
  it('implies ViewAuditLog for auditLogs:Export, not the literal Read', () => {
    expect(missingImpliedReads([pair('auditLogs', 'Export')])).toEqual([
      pair('auditLogs', 'ViewAuditLog'),
    ]);
  });

  it('reports nothing when auditLogs:Export is granted alongside ViewAuditLog', () => {
    expect(
      missingImpliedReads([pair('auditLogs', 'Export'), pair('auditLogs', 'ViewAuditLog')]),
    ).toEqual([]);
  });

  /**
   * Independent review, round 4 (I7). Without this, a role built with a
   * non-reserved action whose implied read IS reserved was told to add that
   * read (`400 impliedReadMissing`) — advice that granting itself refuses
   * (`403 ungrantableCapability`), the same unfollowable-advice shape fix
   * round 1 removed from the assign path, reappearing here on the build path.
   * `users:Archive`/`Restore` were the case this closed for; both joined the
   * reserved set outright on 2026-09-28 (ADR-0104), so `assertGrantable` now
   * refuses them before this rule runs — this still exercises the pure
   * function directly, which is what stays generic for the next resource
   * shaped the same way.
   */
  it('stays silent when the implied read is itself reserved to the Super Admin', () => {
    expect(missingImpliedReads([pair('users', 'Archive')])).toEqual([]);
    expect(missingImpliedReads([pair('users', 'Restore')])).toEqual([]);
  });

  it('ignores a pair the catalogue does not define', () => {
    // Fails closed rather than inventing an implication for a resource that
    // does not exist.
    expect(missingImpliedReads([pair('nonsenseResource', 'Archive')])).toEqual([]);
  });

  it('reports nothing for an empty grant', () => {
    expect(missingImpliedReads([])).toEqual([]);
  });
});
