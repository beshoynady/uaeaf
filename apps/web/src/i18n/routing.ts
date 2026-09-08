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
