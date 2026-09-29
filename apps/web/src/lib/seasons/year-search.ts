import { dubaiDayOf } from "./season-days";

/**
 * Finding a season by year, in whichever numerals the reader types.
 *
 * The site prints every number with Latin digits (Chapter 19 §5), so a query is
 * read as Latin before it is compared: `٢٠٢٦` typed on an Arabic keyboard finds
 * the same seasons as `2026`. Extended Arabic-Indic (`۰–۹`) is read too, since
 * a Persian or Urdu layout produces it for the same keys.
 */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

export const toLatinDigits = (value: string): string =>
  value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const index = ARABIC_INDIC.indexOf(digit);
    return String(index === -1 ? EXTENDED_ARABIC_INDIC.indexOf(digit) : index);
  });

interface SearchableSeason {
  slug: string;
  shortName: string;
  startDate: string;
  endDate: string;
}

/** The text a season is found by: its two years (Dubai days), short name and slug. */
export const seasonSearchText = (season: SearchableSeason): string =>
  [dubaiDayOf(season.startDate).year, dubaiDayOf(season.endDate).year, season.shortName, season.slug].join(" ");

/** Whether a season's search text answers a query. An empty query keeps every season. */
export const matchesSeasonQuery = (text: string, query: string): boolean => {
  const wanted = toLatinDigits(query).trim();
  return wanted === "" || text.includes(wanted);
};
