import type { EditorialActor } from "./editorial-state";

/**
 * A record's version history, exactly as the API reports it.
 *
 * `GET /revisions?entityType&entityId` is the one source, and
 * `RevisionHistoryPageDto` in the API is its declaration. This file mirrors
 * that declaration; it is not a second opinion about it.
 *
 * Two permissions gate the read upstream, not one: `revisions:Read` says the
 * caller may read history at all, and the entity type's own `Read` says whose
 * — checked inside `PublishingService` so no future route can mount the read
 * without it. Nothing here re-derives either.
 */

/**
 * What became of a version.
 *
 * `Draft` is not a stored status: it is the absence of a publications row,
 * and it is the common case. Most versions are frozen, superseded, and never
 * go live.
 */
export const REVISION_STATES = ["Draft", "Live", "Unpublished", "Archived"] as const;
export type RevisionState = (typeof REVISION_STATES)[number];

export interface RevisionSummary {
  id: string;
  /** Version number within this record, starting at 1. */
  versionNumber: number;
  createdAt: string;
  createdBy: EditorialActor | null;
  state: RevisionState;
  /** ISO date this version went live; null if it never did. */
  publishedAt: string | null;
}

export interface RevisionHistoryPage {
  items: RevisionSummary[];
  /** Versions this record has in all, not on this page. */
  total: number;
  page: number;
  limit: number;
}

export interface RevisionDetail extends RevisionSummary {
  entityType: string;
  entityId: string;
  /**
   * The frozen content, already reduced upstream to the fields this entity
   * type allows a reader to see. Untyped on purpose: this panel serves twelve
   * entity types with twelve different shapes, and claiming one of them here
   * would be a lie for eleven.
   */
  content: Record<string, unknown>;
}

/** The message key for a version's state. A closed map rather than string
 *  interpolation, so a state the API adds renders as nothing recognisable
 *  rather than as a missing-key crash. */
export const REVISION_STATE_KEYS: Record<RevisionState, string> = {
  Draft: "stateDraft",
  Live: "stateLive",
  Unpublished: "stateUnpublished",
  Archived: "stateArchived",
};

/** Whether more versions exist than the pages loaded so far hold. */
export function hasMore(loaded: number, total: number): boolean {
  return loaded < total;
}

/**
 * Merges a newly loaded page into what is already on screen.
 *
 * De-duplicated by id rather than concatenated: a version published between
 * two page reads shifts every later row by one, and a plain concatenation
 * would then show one version twice and hide another entirely.
 */
export function mergePages(
  loaded: readonly RevisionSummary[],
  incoming: readonly RevisionSummary[],
): RevisionSummary[] {
  const seen = new Set(loaded.map((item) => item.id));
  return [...loaded, ...incoming.filter((item) => !seen.has(item.id))];
}

/**
 * Plain text out of whatever a snapshot field holds.
 *
 * The reader shows what a version said, not how it was marked up: there is no
 * word-level comparison here (owner decision), and rendering stored rich text
 * as live HTML would put a past version's markup back into the page that the
 * allowlist only ever admitted through the editor.
 *
 * Returns null for "nothing a reader would see", which the reader draws as a
 * dash rather than as an empty row.
 */
export function readableText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map(readableText).filter((part): part is string => part !== null);
    return parts.length === 0 ? null : parts.join("\n");
  }
  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    // A ProseMirror text node. Checked before the generic object walk so the
    // text comes out in document order rather than in key order.
    if (typeof node.text === "string") {
      return node.text;
    }
    if (Array.isArray(node.content)) {
      return readableText(node.content);
    }
    const parts = Object.values(node)
      .map(readableText)
      .filter((part): part is string => part !== null);
    return parts.length === 0 ? null : parts.join("\n");
  }
  return null;
}

/** True for the bilingual `{ ar, en }` shape, which the reader labels by
 *  language instead of flattening into one run of text. */
export function isLocalized(value: unknown): value is { ar: unknown; en: unknown } {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "ar" in value &&
    "en" in value
  );
}
