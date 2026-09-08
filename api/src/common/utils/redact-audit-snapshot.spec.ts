import { redactAuditSnapshot } from './redact-audit-snapshot.js';

/**
 * The audit trail stores whole-document snapshots. `newValue` was always a
 * response body, which is already an allowlist for users — but capturing
 * `previousValue` means reading the stored document directly, and the stored
 * user document carries `authMethods[].passwordHash`.
 *
 * Writing that into a collection built to be read by administrators, and now
 * readable over HTTP, would turn the audit trail into a password-hash
 * dump. These tests are the guard on that.
 */
describe('redactAuditSnapshot', () => {
  it('removes the password hash from an account snapshot', () => {
    const snapshot = redactAuditSnapshot({
      _id: 'abc',
      email: 'noor@uaeaf.ae',
      authMethods: [{ provider: 'Local', passwordHash: '$2a$10$reallysecret', linkedAt: new Date() }],
    });

    expect(JSON.stringify(snapshot)).not.toContain('reallysecret');
    expect(snapshot).not.toHaveProperty('authMethods');
    expect(snapshot).toMatchObject({ email: 'noor@uaeaf.ae' });
  });

  it('removes a live password-reset token', () => {
    // A reset token in the audit trail is a working credential for whoever
    // reads it.
    const snapshot = redactAuditSnapshot({
      email: 'noor@uaeaf.ae',
      passwordResetToken: 'tok-9f3a',
      passwordResetExpiresAt: new Date(),
    });

    expect(snapshot).not.toHaveProperty('passwordResetToken');
    expect(snapshot).not.toHaveProperty('passwordResetExpiresAt');
  });

  it('removes a bare passwordHash wherever it sits', () => {
    expect(redactAuditSnapshot({ passwordHash: 'x' })).not.toHaveProperty('passwordHash');
  });

  it('drops mongo bookkeeping that says nothing about the change', () => {
    const snapshot = redactAuditSnapshot({ _id: 'abc', __v: 3, name: { en: 'Editor', ar: 'محرّر' } });

    expect(snapshot).not.toHaveProperty('__v');
    expect(snapshot).toMatchObject({ name: { en: 'Editor', ar: 'محرّر' } });
  });

  it('keeps the id, which is what makes a snapshot traceable', () => {
    expect(redactAuditSnapshot({ _id: 'abc' })).toMatchObject({ _id: 'abc' });
  });

  it('leaves a role snapshot untouched, because it holds no secrets', () => {
    const role = { _id: 'r1', name: { en: 'Editor', ar: 'محرّر' }, permissionIds: ['p1'], isSystemRole: false };

    expect(redactAuditSnapshot({ ...role })).toMatchObject(role);
  });

  it('returns null for nothing at all', () => {
    expect(redactAuditSnapshot(null)).toBeNull();
    expect(redactAuditSnapshot(undefined)).toBeNull();
  });

  it('returns null for a non-object, rather than an unusable wrapper', () => {
    expect(redactAuditSnapshot('deleted')).toBeNull();
  });
});
