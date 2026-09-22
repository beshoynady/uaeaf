/**
 * The reading rate for both languages: the upper end of the owner's range for
 * Arabic, 180–200 words a minute (decision 2026-09-22), which is also an
 * ordinary rate for English prose.
 */
export const WORDS_PER_MINUTE = 200;

/** Every text node's text, in document order, from a ProseMirror document. */
const textOf = (node: unknown): string[] => {
  if (!node || typeof node !== "object") return [];
  const { text, content } = node as { text?: unknown; content?: unknown };
  const own = typeof text === "string" ? [text] : [];
  return Array.isArray(content) ? [...own, ...content.flatMap(textOf)] : own;
};

/**
 * How long one language edition of a story takes to read, in whole minutes.
 *
 * Counted from the words themselves rather than stored, so it cannot drift
 * from the text. Rounded up, because "under a minute" read as "0 minutes"
 * tells a reader nothing; and never less than one for the same reason.
 */
export const readingMinutes = (document: unknown): number => {
  const words = textOf(document)
    .join(" ")
    .split(/\s+/)
    .filter((word) => word !== "").length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};
