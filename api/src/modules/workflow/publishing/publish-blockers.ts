import { findPendingContent } from './pending-content.js';
import { PUBLISH_REQUIREMENTS } from '../../../common/constants/entity-content.js';
import type { PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';
import type { ApiErrorCode } from '../../../common/errors/api-error-code.js';

/**
 * Everything standing between a draft and the public site, as one list.
 *
 * One list rather than two arrays because the dashboard draws one thing: a
 * "what is missing before publishing" panel above the publish button (owner
 * decision 2026-09-12 — an indicator, not an error when the button is
 * pressed). Two arrays would mean two renderers and two chances to forget
 * the second one.
 *
 * The `kind` is kept because the two blockers are different jobs for
 * different people: `pendingContent` is copy the client has not supplied,
 * `missingRequired` is an upload the editor can do now.
 */
export type PublishBlockerKind = 'pendingContent' | 'missingRequired';

export interface PublishBlocker {
  kind: PublishBlockerKind;
  /** The record path, e.g. `pullQuote.en` or `featuredImageId`. */
  field: string;
}

/**
 * A required field counts as missing when it holds nothing a reader would
 * see: absent, null, an empty string, or an empty list. `0` and `false` are
 * values, not gaps, and are left alone.
 */
function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return Array.isArray(value) && value.length === 0;
}

/** Every reason this record may not be published yet, in the order the
 *  dashboard lists them. */
export function findPublishBlockers(
  entityType: PublicationEntityType,
  record: Record<string, unknown>,
): PublishBlocker[] {
  const pending: PublishBlocker[] = findPendingContent(record).map((field) => ({
    kind: 'pendingContent',
    field,
  }));

  const missing: PublishBlocker[] = PUBLISH_REQUIREMENTS[entityType]
    .filter((field) => isMissing(record[field]))
    .map((field) => ({ kind: 'missingRequired' as const, field }));

  return [...pending, ...missing];
}

/**
 * The refusal a non-empty blocker list becomes: one code and one message,
 * returned together because they are never wanted apart.
 *
 * The code leads with pending content when both kinds are present — that is
 * the refusal the editor cannot clear on their own, so it is the one worth
 * naming first. The message names every blocker regardless, because a refusal
 * that lists half the reasons sends the editor back for a second refusal.
 */
export function describePublishBlockers(blockers: readonly PublishBlocker[]): {
  code: ApiErrorCode;
  message: string;
} {
  const pending: string[] = [];
  const missing: string[] = [];
  for (const blocker of blockers) {
    (blocker.kind === 'pendingContent' ? pending : missing).push(blocker.field);
  }

  const parts: string[] = [];
  if (pending.length > 0) {
    parts.push(`still marked as awaiting the client: ${pending.join(', ')}`);
  }
  if (missing.length > 0) {
    parts.push(`required before publishing and still empty: ${missing.join(', ')}`);
  }

  return {
    code: pending.length > 0 ? 'pendingContent' : 'missingRequiredField',
    message: `This record is not ready to publish — ${parts.join('; ')}.`,
  };
}
