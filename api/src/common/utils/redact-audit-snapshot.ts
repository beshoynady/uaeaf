/**
 * Strips credentials out of a document snapshot before it is written to the
 * audit trail.
 *
 * `auditLogs` stores whole-document snapshots in `previousValue`/`newValue`.
 * That was harmless while `newValue` was only ever a response body — those
 * are allowlisted at the controller. Capturing `previousValue` changes it:
 * the pre-image is read straight from the collection, and the stored user
 * document carries `authMethods[].passwordHash`.
 *
 * Writing those into a collection that exists to be read by administrators —
 * and which, since 2026-09-08, is readable over HTTP — would make the audit
 * trail the single richest credential target in the platform. So the denylist
 * is applied to both sides of every snapshot, not just the new one.
 *
 * A denylist rather than an allowlist, deliberately: the interceptor is
 * generic over every collection, so it cannot know which fields are
 * meaningful. Anything not named here is kept, and a new secret-bearing
 * field is a line to add — which is why the list names the field families
 * rather than one path.
 */
const REDACTED_KEYS: ReadonlySet<string> = new Set([
  // Credentials.
  'authMethods',
  'passwordHash',
  'password',
  'passwordResetToken',
  'passwordResetExpiresAt',
  // Mongo bookkeeping that describes the document's storage, not the change.
  '__v',
]);

export function redactAuditSnapshot(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  // A Mongoose document must be flattened before its own keys are readable.
  const source =
    typeof (value as { toObject?: unknown }).toObject === 'function'
      ? (value as { toObject(): Record<string, unknown> }).toObject()
      : (value as Record<string, unknown>);

  const clean: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (!REDACTED_KEYS.has(key)) {
      clean[key] = entry;
    }
  }
  return clean;
}
