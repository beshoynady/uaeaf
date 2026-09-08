import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Chapter 14, implemented once.
 *
 * The chapter is unusually specific, so this file is mostly transcription
 * rather than judgement:
 *
 *  §3  Meta Title, Meta Description and a Social Sharing Image MUST exist for
 *      every page "without exception, including pages generated from
 *      operational data".
 *  §5  Every page MUST define a canonical URL.
 *  §10 Every bilingual page MUST carry reciprocal `hreflang` annotations
 *      connecting the two language versions.
 *  §11 A page that does not meet the minimum content threshold SHOULD stay
 *      `noindex` until its content is complete — which is the documented
 *      answer to the nine listing pages whose items the API cannot serve yet,
 *      and the reason `indexable` is a required argument rather than a flag
 *      with a convenient default.
 *  §14 Multiple representations of the same data MUST canonicalise to the
 *      primary, unfiltered version.
 */

/**
 * The site's own origin.
 *
 * Canonical and hreflang URLs are absolute by definition — a relative
 * canonical is resolved against whatever host served the page, which defeats
 * the purpose of declaring one. PENDING OWNER DECISION: the production
 * hostname is not recorded anywhere in the design system or product docs, so
 * this reads an environment variable and falls back to the dev origin. It is
 * configuration, not a design decision, but it does have to be set before the
 * site is deployed or every canonical will point at localhost.
 */
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);

/** BCP 47 tags for the two locales. `ar-AE` rather than bare `ar`: the
 *  federation is a UAE national body and the regional variant is the accurate
 *  claim. `en` stays unregioned — the English edition is for an international
 *  audience, not a specific anglophone market. */
const HREFLANG: Record<AppLocale, string> = { ar: "ar-AE", en: "en" };

/** Open Graph locale tags. */
const OG_LOCALE: Record<AppLocale, string> = { ar: "ar_AE", en: "en_US" };

export function absoluteUrl(locale: AppLocale, route: string): string {
  const path = route === "/" ? "" : route;
  return `${SITE_ORIGIN}/${locale}${path}`;
}

export interface PageSeo {
  locale: AppLocale;
  /** Locale-relative route, exactly as it appears in the page registry. */
  route: string;
  title: string;
  description: string;
  /** Chapter 14 §11. `false` emits `noindex, follow` — follow, not nofollow,
   *  because the page's internal links are still worth crawling even when the
   *  page itself is not worth indexing. */
  indexable: boolean;
  /** Schema.org type is emitted separately as JSON-LD; this is the OG type. */
  ogType?: "website" | "article";
}

export function buildMetadata({
  locale,
  route,
  title,
  description,
  indexable,
  ogType = "website",
}: PageSeo): Metadata {
  const canonical = absoluteUrl(locale, route);

  // §10 — reciprocal, so every language version lists every other one
  // including itself. `x-default` points at the default locale, which
  // `routing` already declares as Arabic; hardcoding "ar" here would be a
  // second source for the same fact.
  const languages: Record<string, string> = {};
  for (const other of routing.locales) {
    languages[HREFLANG[other]] = absoluteUrl(other, route);
  }
  languages["x-default"] = absoluteUrl(routing.defaultLocale, route);

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title,
    description,
    alternates: { canonical, languages },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: ogType,
      url: canonical,
      title,
      description,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
