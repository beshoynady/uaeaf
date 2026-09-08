import { defineRouting } from "next-intl/routing";

/**
 * Owner decision (2026-09-07): the admin dashboard is Arabic by default and
 * also supports English; after login the user's own `preferredLanguage`
 * (users schema, added 2026-09-07) takes over. That per-user override is
 * applied at login time in the BFF login route — this config only defines
 * the routing default for anyone not yet authenticated.
 *
 * Deliberately identical in shape to apps/web's routing so the two apps
 * cannot drift on locale codes or prefix behaviour.
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
});

export type AppLocale = (typeof routing.locales)[number];

/** Direction is a UAEAF layout concern (CLAUDE.md RTL structure governance),
 *  mapped once here rather than scattered as inline ternaries. */
export const localeDirection: Record<AppLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

/** Narrows an arbitrary string to a supported locale. Used wherever a value
 *  arrives from outside the router — a cookie, or the API's
 *  `preferredLanguage` — and must not be trusted to be one of ours. */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (routing.locales as readonly string[]).includes(value);
}
