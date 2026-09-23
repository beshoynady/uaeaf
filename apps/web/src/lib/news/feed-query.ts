import type { TimeRange } from "@uaeaf/content/time-range";
import type { ArticleTopic } from "@/lib/api/types";

/**
 * Everything that narrows the newsroom's listing, as one address.
 *
 * Every view of the feed is a page of it, so every view is a URL: a reader can
 * bookmark "records, this month, page 2", send it to a colleague and undo any
 * part of it with the browser's own back button. That is the rule
 * `time-filter.tsx` was built on, and the topic chips and the pager join it
 * rather than inventing a second mechanism beside it.
 *
 * ── Why the href is built in one place ─────────────────────────────────────
 *
 * Three controls now write this address — the time filter, the topic chips and
 * the pager — and each must carry the other two untouched. Three copies of
 * that rule is three chances for one control to drop a filter somebody set,
 * and the failure is silent: the reader simply finds themselves looking at a
 * feed they did not ask for. One builder means "changing a filter keeps the
 * others" is a property of the page rather than a convention each control is
 * trusted to remember.
 */
export interface FeedQuery {
  /** One free label, matched whole and case-insensitively upstream. */
  tag?: string;
  /** One subject from the closed list (ADR-0094). */
  topic?: ArticleTopic;
  /** A window on the publication date. */
  range: TimeRange;
  /** 1-based. Page 1 is written as no parameter at all. */
  page: number;
}

/**
 * The listing's address for a changed query.
 *
 * ── Why a page change is the only one that keeps the page ──────────────────
 *
 * Narrowing the feed changes which articles exist in it, so the page number a
 * reader was on no longer describes anything: page 4 of an unfiltered feed is
 * usually past the end of a topic. Every change except an explicit page move
 * therefore returns to the first page, which is where the results the reader
 * just asked for begin.
 */
export const feedHref = (current: FeedQuery, change: Partial<FeedQuery> = {}): string => {
  const next: FeedQuery = {
    ...current,
    ...change,
    // A filter change starts again at the top; only `page` moves the page.
    page: change.page ?? (Object.keys(change).length > 0 ? 1 : current.page),
  };

  const query = new URLSearchParams();
  if (next.tag) query.set("tag", next.tag);
  if (next.topic) query.set("topic", next.topic);
  if (next.range.from) query.set("from", next.range.from);
  if (next.range.to) query.set("to", next.range.to);
  // Page 1 is the listing's own address. `?page=1` beside it would be a second
  // URL for one view — two addresses a search engine has to choose between,
  // and two histories the back button has to walk through.
  if (next.page > 1) query.set("page", String(next.page));

  const search = query.toString();
  return search ? `/news?${search}` : "/news";
};

/** How many pages `total` items fill. At least one, so an empty feed is page
 *  1 of 1 rather than page 1 of 0. */
export const pageCount = (total: number, limit: number): number => Math.max(1, Math.ceil(total / limit));

/**
 * A page number the reader may have typed, hand-edited or followed from a
 * stale link, reduced to one that exists.
 *
 * Out of range clamps rather than 404s: the listing is one page under many
 * views, and "page 9 of a feed that now has 3" is a filter that moved on, not
 * an address that never existed.
 */
export const clampPage = (asked: string | undefined, pages = Number.POSITIVE_INFINITY): number => {
  const parsed = Number(asked);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, pages);
};

/**
 * The page numbers a pager shows around the current one.
 *
 * A feed of forty pages cannot draw forty links — the control would be wider
 * than the column and every number in it smaller than the touch floor. This
 * keeps a window of `span` around the current page, always including the first
 * and last so the two ends of the feed are always one click away, and marks
 * the breaks so the caller can draw an ellipsis rather than implying the
 * numbers are consecutive.
 */
export const pageWindow = (current: number, pages: number, span = 1): (number | "gap")[] => {
  const shown = new Set<number>([1, pages]);
  for (let page = current - span; page <= current + span; page += 1) {
    if (page >= 1 && page <= pages) shown.add(page);
  }

  const ordered = [...shown].sort((a, b) => a - b);
  return ordered.flatMap((page, index) => {
    const previous = ordered[index - 1];
    // A single missing number is drawn as itself: an ellipsis standing for one
    // page is wider than the page it hides.
    if (previous !== undefined && page - previous === 2) return [previous + 1, page];
    if (previous !== undefined && page - previous > 2) return ["gap" as const, page];
    return [page];
  });
};
