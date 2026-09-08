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
    expect(missingImpliedReads([pair('athletes', 'Delete')])).toEqual([
      pair('athletes', 'Read'),
    ]);
  });

  it('reports nothing when the Read is already granted', () => {
    expect(
      missingImpliedReads([pair('athletes', 'Delete'), pair('athletes', 'Read')]),
    ).toEqual([]);
  });

  it('treats Read on its own as complete', () => {
    expect(missingImpliedReads([pair('auditLogs', 'Read')])).toEqual([]);
  });

  it('names each resource once however many write actions it carries', () => {
    expect(
      missingImpliedReads([
        pair('roles', 'Create'),
        pair('roles', 'Update'),
        pair('roles', 'Delete'),
      ]),
    ).toEqual([pair('roles', 'Read')]);
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
      missingImpliedReads([pair('venues', 'Create'), pair('clubs', 'Delete')]),
    ).toEqual([pair('clubs', 'Read'), pair('venues', 'Read')]);
  });

  it('ignores a pair the catalogue does not define', () => {
    // Fails closed rather than inventing an implication for a resource that
    // does not exist.
    expect(missingImpliedReads([pair('nonsenseResource', 'Delete')])).toEqual([]);
  });

  it('reports nothing for an empty grant', () => {
    expect(missingImpliedReads([])).toEqual([]);
  });
});
