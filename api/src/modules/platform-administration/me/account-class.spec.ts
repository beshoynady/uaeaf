import { accountClassFor } from './account-class.js';

describe('accountClassFor', () => {
  it('is superAdmin when the account holds a system role', () => {
    expect(accountClassFor([], true)).toBe('superAdmin');
  });

  it.each(['ManageRoles', 'AssignRoles', 'ViewSensitive', 'Export', 'PermanentDelete', 'ViewAuditLog'] as const)(
    'is sensitive for %s',
    (action) => {
      expect(accountClassFor([{ resourceType: 'mediaAssets', action, scope: null }], false)).toBe('sensitive');
    },
  );

  it('is sensitive for an account reading the audit log without a system role', () => {
    expect(accountClassFor([{ resourceType: 'auditLogs', action: 'ViewAuditLog', scope: null }], false)).toBe(
      'sensitive',
    );
  });

  it('is standard for an account holding articles:Read only', () => {
    expect(accountClassFor([{ resourceType: 'articles', action: 'Read', scope: null }], false)).toBe('standard');
  });

  it('is standard for an editor', () => {
    expect(accountClassFor([{ resourceType: 'articles', action: 'Update', scope: 'own' }], false)).toBe('standard');
  });

  it('is standard for an account holding nothing', () => {
    expect(accountClassFor([], false)).toBe('standard');
  });

  it('prefers superAdmin over sensitive when both apply', () => {
    expect(accountClassFor([{ resourceType: 'athletes', action: 'Export', scope: null }], true)).toBe('superAdmin');
  });
});
