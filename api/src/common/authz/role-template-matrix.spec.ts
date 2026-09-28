import { ROLE_TEMPLATES } from './role-templates.js';
import type { RoleTemplate, RoleTemplateGrant } from './role-templates.js';
import { capabilityFor, isSuperAdminOnly } from './capability-map.js';
import { PERMISSION_CATALOGUE } from '../constants/permission-catalogue.js';
import type { PermissionCatalogueEntry } from '../constants/permission-catalogue.js';
import { missingImpliedReads } from '../constants/permission-implications.js';
import type { PermissionAction } from '../../modules/platform-administration/permissions/schemas/permission.schema.js';

const everyGrant = (templates: readonly RoleTemplate[]): RoleTemplateGrant[] =>
  templates.flatMap((template) => [...template.grants]);

const pairsOf = (
  templates: readonly RoleTemplate[],
): PermissionCatalogueEntry[] =>
  everyGrant(templates).flatMap((grant) =>
    grant.resources.flatMap((resourceType) =>
      grant.actions.map((action) => ({ resourceType, action })),
    ),
  );

const key = (pair: PermissionCatalogueEntry): string =>
  `${pair.resourceType}:${pair.action}`;

const scopesFor = (resource: string): readonly string[] =>
  capabilityFor(resource)?.scopes ?? [];

const templateFor = (templateKey: string): RoleTemplate => {
  const template = ROLE_TEMPLATES.find((t) => t.key === templateKey);
  if (!template) {
    throw new Error(`No template keyed ${templateKey}`);
  }
  return template;
};

describe('the six role templates', () => {
  it('is exactly these six keys, in this order', () => {
    expect(ROLE_TEMPLATES.map((t) => t.key)).toEqual([
      'content-manager',
      'editor',
      'reviewer-approver',
      'sports-data-officer',
      'governance-officer',
      'executive-viewer',
    ]);
  });

  it('names no pair that is absent from the catalogue', () => {
    const known = new Set(PERMISSION_CATALOGUE.map(key));
    expect(
      pairsOf(ROLE_TEMPLATES)
        .filter((p) => !known.has(key(p)))
        .map(key),
    ).toEqual([]);
  });

  it('holds no superAdminOnly pair', () => {
    expect(
      pairsOf(ROLE_TEMPLATES)
        .filter((p) => isSuperAdminOnly(p.resourceType, p.action))
        .map(key),
    ).toEqual([]);
  });

  it('holds PermanentDelete nowhere', () => {
    expect(
      pairsOf(ROLE_TEMPLATES)
        .filter((p) => p.action === 'PermanentDelete')
        .map(key),
    ).toEqual([]);
  });

  it('gives every template at least one grant', () => {
    expect(
      ROLE_TEMPLATES.filter((t) => pairsOf([t]).length === 0).map((t) => t.key),
    ).toEqual([]);
  });

  it('declares a scope only where the capability map offers one', () => {
    for (const grant of everyGrant(ROLE_TEMPLATES)) {
      if (grant.scope === null) continue;
      for (const resource of grant.resources) {
        expect({ resource, scopes: scopesFor(resource) }).toEqual({
          resource,
          scopes: expect.arrayContaining([grant.scope]),
        });
      }
    }
  });

  // The seed writes roles to the model directly, bypassing RolesService's
  // coherence check, so an incoherent template would first surface as a 400.
  it('leaves no template able to change a resource it cannot read', () => {
    for (const template of ROLE_TEMPLATES) {
      expect({
        [template.key]: missingImpliedReads(pairsOf([template])).map(key),
      }).toEqual({
        [template.key]: [],
      });
    }
  });

  it.each([
    ['editor', 'Publish'],
    ['editor', 'Restore'],
    ['editor', 'Approve'],
    ['editor', 'Archive'],
    ['governance-officer', 'PermanentDelete'],
    ['sports-data-officer', 'ViewSensitive'],
    ['sports-data-officer', 'Approve'],
    ['content-manager', 'Publish'],
    ['content-manager', 'ViewSensitive'],
    ['executive-viewer', 'Export'],
    ['executive-viewer', 'Print'],
  ])('%s really does not hold %s', (templateKey, action) => {
    expect(templateFor(templateKey).deliberatelyAbsent).toContain(action);
    expect(
      pairsOf([templateFor(templateKey)]).some((p) => p.action === action),
    ).toBe(false);
  });

  it('grants no template any action it lists as deliberately absent', () => {
    for (const template of ROLE_TEMPLATES) {
      const absent = new Set(template.deliberatelyAbsent);
      expect({
        [template.key]: pairsOf([template])
          .filter((p) => absent.has(p.action))
          .map(key),
      }).toEqual({ [template.key]: [] });
    }
  });

  it('gives the executive viewer ViewReports on exactly these eight report resources', () => {
    expect(
      pairsOf([templateFor('executive-viewer')])
        .map(key)
        .sort(),
    ).toEqual(
      [
        'governanceReports:ViewReports',
        'peopleReports:ViewReports',
        'athleticsReports:ViewReports',
        'mediaReports:ViewReports',
        'documentsReports:ViewReports',
        'sponsorshipReports:ViewReports',
        'commsReports:ViewReports',
        'cmsReports:ViewReports',
      ].sort(),
    );
  });

  it('gives the executive viewer nothing on workflowReports', () => {
    expect(
      pairsOf([templateFor('executive-viewer')]).filter(
        (p) => p.resourceType === 'workflowReports',
      ),
    ).toEqual([]);
  });

  it('gives the editor only Read, Create and Update on its own articles and albums', () => {
    expect(templateFor('editor').grants).toEqual([
      {
        resources: ['articles', 'albums'],
        actions: ['Read', 'Create', 'Update'],
        scope: 'own',
      },
    ]);
  });

  it('gives the executive viewer no write verb at all', () => {
    const writes: PermissionAction[] = [
      'Create',
      'Update',
      'Archive',
      'Restore',
      'Publish',
      'Approve',
    ];
    expect(
      pairsOf([templateFor('executive-viewer')])
        .filter((p) => writes.includes(p.action))
        .map(key),
    ).toEqual([]);
  });
});
