import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Verified against next-intl 4.14.2 docs (2026-09-07): `requestLocale` is a
 * Promise corresponding to the `[locale]` route segment; falling back to
 * `routing.defaultLocale` covers a request that somehow reaches here with
 * no/invalid locale before the proxy has a chance to redirect it.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
