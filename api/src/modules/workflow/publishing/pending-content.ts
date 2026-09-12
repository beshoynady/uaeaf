/**
 * The marker that says "the client has not supplied this yet" (ADR-0069 D5,
 * owner decision Q16).
 *
 * Three pieces of this page's copy are genuinely missing: the canonical
 * English pull-quote, the clause English ¶5 drops, and the master portrait
 * (`page-president-message.md` §7.5-6). The alternative to a marker is
 * inventing text, and invented text on a federation president's signed
 * statement is worse than a visible gap.
 *
 * The marker is deliberately ugly and deliberately not a word anyone writes
 * by accident. Publishing is refused while any field still carries it: a
 * placeholder that can reach production is not a placeholder, it is a typo
 * with a deadline.
 */
export const PENDING_CONTENT_MARKER = '[[pending-content]]';

/**
 * Every path in the record that still carries the marker, in the order they
 * are found.
 *
 * Walks the whole document rather than a list of known fields, so a marker
 * inside rich text, inside an array of values, or inside a field added next
 * month is found without this function being updated for it.
 */
export function findPendingContent(value: unknown, path = ''): string[] {
  if (typeof value === 'string') {
    return value.includes(PENDING_CONTENT_MARKER) ? [path || '(root)'] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findPendingContent(item, `${path}[${index}]`));
  }

  // Dates, ObjectIds and Buffers are objects with no content to search;
  // `Object.entries` on them yields nothing useful, so plain objects only.
  if (value !== null && typeof value === 'object' && isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      findPendingContent(item, path ? `${path}.${key}` : key),
    );
  }

  return [];
}

/** True when any part of the record still carries the marker. */
export function hasPendingContent(value: unknown): boolean {
  return findPendingContent(value).length > 0;
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
