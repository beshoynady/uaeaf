import type { AppLocale } from "@/i18n/routing";

import type { GovernanceDocument } from "./governance-documents";

/**
 * Search and formatting for the Regulations & Policies page.
 *
 * Split out of `governance-documents.ts` so that the seed records cannot reach
 * the browser. The page's browser is a Client Component and imports these
 * helpers; importing them from the module that also holds `SEED` puts that
 * array in the client module graph, where tree shaking *probably* removes it.
 * A separate module makes it certain rather than probable, and the certainty is
 * worth one file — the records also arrive as props, so a copy in the bundle
 * would be the same data shipped twice.
 */

/**
 * Normalises text to what a reader is likely to type.
 *
 * NFKD splits a composed letter into its base plus its marks, so stripping the
 * marks afterwards folds both the Latin accents and the Arabic ones.
 *
 * The mark ranges are given in full, and U+0654 — hamza above — is the one that
 * matters: NFKD turns `أ` into `ا` + U+0654, so a range ending at U+0652 leaves
 * the hamza attached and "الاساسي" fails to find "الأساسي". Measured, on this
 * page, before the range was widened.
 */
export const fold = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯؐ-ًؚ-ٰٟۖ-ۭ]/g, "")
    // Belt and braces for the pre-composed forms NFKD leaves alone.
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

/**
 * A document's searchable text, folded once.
 *
 * Folding inside the per-document predicate re-normalised every title and
 * description on every keystroke — up to sixteen normalisations per character
 * typed, all producing the same strings. The document text does not change, so
 * it is folded once and kept.
 */
export const foldDocument = (document: GovernanceDocument, locale: AppLocale): string =>
  fold(`${document.title[locale]} ${document.description[locale]}`);

/**
 * Whether an already-folded haystack contains an already-folded needle.
 *
 * Both sides are folded by the caller, which is what keeps the needle from
 * being re-normalised once per document.
 */
export const matchesFolded = (haystack: string, needle: string): boolean =>
  needle === "" || haystack.includes(needle);

/**
 * `Intl` formatters, cached per locale.
 *
 * Both constructors are among the more expensive in the language, and building
 * one per card per render would mean up to sixteen constructions per keystroke
 * once the documents carry real dates and sizes. The cost is zero today only
 * because no seed record has either.
 */
const NUMBER_FORMATS = new Map<string, Intl.NumberFormat>();
const DATE_FORMATS = new Map<string, Intl.DateTimeFormat>();

/**
 * The locale tag, with the numbering system pinned.
 *
 * `ar-AE` on its own resolves to Arabic-Indic digits, and `i18n/request.ts`
 * pins `numberingSystem: "latn"` on every named format for exactly that reason
 * (Chapter 19 §5). A raw `Intl` formatter built here would bypass that pinning
 * and print `١٢ مارس` beside dates the rest of the site prints as `12 March` —
 * the same bypass `request.ts` warns about, one module further out.
 */
const localeTag = (locale: AppLocale) =>
  locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE";

/** Byte count to a short, localised label. Absent stays absent. */
export const formatFileSize = (
  bytes: number | undefined,
  locale: AppLocale,
): string | undefined => {
  if (bytes === undefined) return undefined;

  const tag = localeTag(locale);
  let format = NUMBER_FORMATS.get(tag);
  if (format === undefined) {
    format = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });
    NUMBER_FORMATS.set(tag, format);
  }
  return format.format(bytes / 1_000_000) + (locale === "ar" ? " م.ب" : " MB");
};

/** ISO date to a localised date. Absent stays absent. */
export const formatPublishedAt = (
  iso: string | undefined,
  locale: AppLocale,
): string | undefined => {
  if (iso === undefined) return undefined;

  const tag = localeTag(locale);
  let format = DATE_FORMATS.get(tag);
  if (format === undefined) {
    format = new Intl.DateTimeFormat(tag, { year: "numeric", month: "long", day: "numeric" });
    DATE_FORMATS.set(tag, format);
  }
  return format.format(new Date(iso));
};
