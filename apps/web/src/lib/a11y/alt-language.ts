/**
 * Page rule 6's automated half: an alternative text is written in the language
 * it is declared in (`page-building-guide.md` §8, ADR-0085 D3.4).
 *
 * The declared language is the page's, unless the image or its nearest
 * ancestor with a `lang` attribute says otherwise. That exception exists for
 * one reason: an organisation named in a single language keeps that name on
 * both pages (ADR-0085 D4), inside `lang`, so a screen reader pronounces it
 * right. A foreign text that does not declare its language still fails.
 *
 * Whether the text describes the picture is for a person to judge; this only
 * reads the script.
 */

export type PageLocale = "ar" | "en";

const ARABIC = /\p{Script=Arabic}/u;
const LATIN = /\p{Script=Latin}/u;

/** `en-GB` → `en`; anything empty is no declaration. */
const primaryLanguage = (lang: string | null): string | null => {
  const primary = lang?.trim().split("-")[0]?.toLowerCase();
  return primary ? primary : null;
};

/**
 * `null` when the alternative text passes, otherwise a sentence naming what is
 * wrong, for the test's failure message.
 *
 * @param lang the image's own `lang`, or its nearest ancestor's; `null` when
 * nothing between it and the page's root declares one.
 */
export const altLanguageProblem = ({
  alt,
  lang,
  pageLocale,
}: {
  alt: string;
  lang: string | null;
  pageLocale: PageLocale;
}): string | null => {
  if (!alt.trim()) return "an alternative text is required";

  const declared = primaryLanguage(lang) ?? pageLocale;
  if (declared === "ar") {
    return ARABIC.test(alt) ? null : `"${alt}" is declared Arabic but is not written in Arabic`;
  }
  if (declared === "en") {
    return !ARABIC.test(alt) && LATIN.test(alt) ? null : `"${alt}" is declared English but is not written in English`;
  }
  return `"${alt}" declares lang="${declared}", a language this site does not publish in`;
};
