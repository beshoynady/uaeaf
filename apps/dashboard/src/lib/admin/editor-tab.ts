/**
 * The four panels a page editor can offer, in the order the tablist draws them
 * (ADR-0102 §D1).
 *
 * SEO sits directly after the content (owner decision 2026-09-26, amending the
 * canvas's order): both are the author's own writing, so they are adjacent, and
 * the two panels a reader only *consults* — the review path and the version
 * history — follow. The canvas drew SEO last; the owner moved it.
 *
 * `content` is always present; the other three appear only where the page
 * supplies what they show. A tab that is present and empty is worse than an
 * absent one — it tells a reader something is there.
 */
export const EDITOR_TABS = ["content", "seo", "review", "history"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];

/**
 * The tab `?tab=` names, or `content`.
 *
 * Checked against what this page actually offers, not just against the
 * vocabulary: `?tab=seo` on a page with no SEO fields would otherwise open an
 * empty frame, and a stale bookmark is the ordinary way that happens.
 */
export const readEditorTab = (
  value: string | string[] | null | undefined,
  available: readonly EditorTab[],
): EditorTab => {
  // A repeated query parameter arrives as an array. The first is the one the
  // reader's link carried; a second is noise, not a second intention.
  const wanted = Array.isArray(value) ? value[0] : value;
  const named = EDITOR_TABS.find((tab) => tab === wanted);
  return named && available.includes(named) ? named : "content";
};

/**
 * Which tabs a page offers, in the tablist's order.
 *
 * Derived from what the page supplied rather than passed in, so a screen cannot
 * name a tab it has no content for. `content` is unconditional: a page editor
 * with no fields is not a state this shell has.
 */
export const availableTabs = (has: {
  review: boolean;
  history: boolean;
  seo: boolean;
}): readonly EditorTab[] =>
  EDITOR_TABS.filter((tab) => tab === "content" || has[tab]);
