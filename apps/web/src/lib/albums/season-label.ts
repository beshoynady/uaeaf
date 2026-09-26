/**
 * A season as the album API writes it: `2025–2026`, the two calendar years a
 * September-to-August season spans, joined by an EN DASH (U+2013).
 *
 * It is a label, never an id. The platform has no season entity, and none is
 * being added (the API's `videos/season.ts` records the decision), so
 * `GET /albums/public/facets` groups published albums by the season their date
 * falls in and names each group by its label, and `GET /albums/public?season=`
 * takes the same label back. The facet's `id` and the label are one string.
 *
 * The API refuses anything its own `seasonLabel` would not produce rather than
 * coercing it, and this refuses the same things — a hyphen in place of the
 * dash, years out of order, two years that are not consecutive — plus any
 * space around the label, which the API would trim: the address carries the
 * label only as the facets write it. A value the API would ignore must not
 * reach the address either, where it would show the reader a filter the list
 * does not apply.
 *
 * The dash is written as an escape so it cannot be retyped as a hyphen by an
 * editor without the test beside this file turning red.
 */
const SEASON_LABEL = /^(\d{4})\u2013(\d{4})$/;

export const isSeasonLabel = (value: string): boolean => {
  const match = SEASON_LABEL.exec(value);
  return match !== null && Number(match[2]) === Number(match[1]) + 1;
};
