import { defineRouting } from "next-intl/routing";

/**
 * Owner decision (2026-09-07 i18n planning session): the bare root path
 * always redirects to the default locale rather than serving un-prefixed
 * content — next-intl's default `localePrefix: "always"` already does this,
 * so no extra redirect logic is needed beyond this config.
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
});

export type AppLocale = (typeof routing.locales)[number];

/**
 * Not part of next-intl's own API — direction is a UAEAF layout concern
 * (CLAUDE.md RTL structure governance), mapped once here rather than
 * scattered as inline ternaries across layout.tsx.
 */
export const localeDirection: Record<AppLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

/**
 * Each language's name in itself (its endonym).
 *
 * Deliberately NOT in `messages/*.json`: an endonym is not translated content
 * — "العربية" is the same string on the English page as on the Arabic one, and
 * that invariance is the whole point. A reader who cannot read the current
 * page still recognises the name of their own language written in their own
 * script, which is the one thing a language switcher must always convey.
 * Keeping it out of the message files also removes the way the two copies
 * could drift apart.
 *
 * Chapter 4 §4.11 keeps this open: a future locale adds one entry here and the
 * switcher needs no other change.
 */
export const LOCALE_ENDONYM: Record<AppLocale, string> = {
  ar: "العربية",
  en: "English",
};
