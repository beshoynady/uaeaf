/**
 * An organisation's name on the page (ADR-0085 D4).
 *
 * Some organisations have a name in one language only, and the federation does
 * not invent the other. The page's language is used when it exists; otherwise
 * the other side is shown as it is, with its own language attached so the page
 * can isolate it (`<bdi lang>`) and a screen reader can pronounce it.
 */

export type ContentLocale = "ar" | "en";

export interface OrganizationNameLike {
  ar?: string | null;
  en?: string | null;
}

export interface DisplayName {
  text: string;
  /** The language of the field the text came from — never guessed from the characters. */
  lang: ContentLocale;
  /** True when the text is not in the page's language. */
  isForeign: boolean;
}

const side = (value: string | null | undefined): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
};

export const displayName = (name: OrganizationNameLike | null | undefined, locale: ContentLocale): DisplayName | null => {
  const other: ContentLocale = locale === "ar" ? "en" : "ar";
  const own = side(name?.[locale]);
  if (own) return { text: own, lang: locale, isForeign: false };
  const fallback = side(name?.[other]);
  return fallback ? { text: fallback, lang: other, isForeign: true } : null;
};
