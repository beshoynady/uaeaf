/**
 * The athletics season, derived from a publication date.
 *
 * This platform has no season entity and none is being added — the search for
 * one (events, fixtures, calendar, competitions, championships) found nothing
 * but string literals. So a season is computed from `publishedAt`, the one
 * date a video already carries, and that has a property a stored field could
 * not: it can never disagree with the date the library is ordered by.
 *
 * The cost is the obvious one, and it is worth stating rather than hiding: a
 * video *about* last season's championship, published this September, is filed
 * under this season. Filing it correctly would need a competition entity to
 * point at, which is exactly what does not exist.
 */

/** September. An athletics season runs September→August, so a label names the
 *  two calendar years it spans. */
export const SEASON_START_MONTH = 9;

/** An en dash, not a hyphen. The label is compared exactly on the way back in,
 *  so the two must not be allowed to drift apart. */
const SEPARATOR = '–';

const startYearOf = (date: Date): number =>
  // `getUTCMonth()` is 0-based; the constant is not, which is why it is +1 here
  // rather than the constant being 8 and unreadable.
  date.getUTCMonth() + 1 >= SEASON_START_MONTH ? date.getUTCFullYear() : date.getUTCFullYear() - 1;

export const seasonLabel = (date: Date): string => {
  const start = startYearOf(date);
  return `${start}${SEPARATOR}${start + 1}`;
};

export interface SeasonRange {
  from: Date;
  to: Date;
}

/**
 * The half-open date range a season label covers, or `null`.
 *
 * Half-open — `from <= publishedAt < to` — so no video can land between two
 * seasons or in both at once, which an inclusive upper bound would allow at
 * exactly midnight on 1 September.
 *
 * The label arrives from a query string, so it is user input: anything that is
 * not a label this module itself would produce is refused rather than coerced.
 */
export const seasonRange = (label: string): SeasonRange | null => {
  const match = /^(\d{4})–(\d{4})$/.exec(label.trim());
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  // Consecutive and in order: `2026–2025` and `2025–2027` are both well-formed
  // and both describe a season that does not exist.
  if (end !== start + 1) return null;

  return {
    from: new Date(Date.UTC(start, SEASON_START_MONTH - 1, 1)),
    to: new Date(Date.UTC(start + 1, SEASON_START_MONTH - 1, 1)),
  };
};
