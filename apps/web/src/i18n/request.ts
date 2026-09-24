import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Chapter 19 §5 and Chapter 9 §CR-1.10: Western/Latin numerals, in both
 * languages, always.
 *
 * `ar` on its own already resolves to `latn` in ICU — but by the locale's
 * default, not by a decision. `ar-EG` and `ar-SA` default to `arab`
 * (٠١٢٣٤٥٦٧٨٩), and so does `ar-u-nu-arab`, a valid tag a reader's own
 * Accept-Language can carry. The chapter rule was being satisfied by
 * coincidence; stating it here means a locale added or narrowed later cannot
 * silently flip every date on the public site into Eastern Arabic digits.
 *
 * These are next-intl's NAMED formats: they reach a call that asks for one by
 * name (`format.dateTime(date, "long")`), never a call that passes its own
 * options object. So the rule holds only while the date components go through
 * `PublishDate`, which is why it is the single component that formats a date.
 */
const FORMATS = {
  dateTime: {
    /** The publication date of a story, wherever one is printed. */
    long: { dateStyle: "long", numberingSystem: "latn" },
  },
} as const;

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
    formats: FORMATS,
  };
});
