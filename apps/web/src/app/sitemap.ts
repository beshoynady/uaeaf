import type { MetadataRoute } from "next";
import { PUBLIC_PAGES } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import { absoluteUrl } from "@/lib/seo/metadata";
import { routing } from "@/i18n/routing";

/**
 * Chapter 14 §13 — XML Sitemap Contract.
 *
 * Two of its rules do the work here:
 *
 *  - "Content in any state other than `Published` MUST NOT appear in any
 *    Sitemap." A page that carries `noindex` because Chapter 14 §11's
 *    content threshold is unmet is exactly that case, so the sitemap and the
 *    robots directive read from the same function. Listing a `noindex` URL
 *    in a sitemap is a contradiction served to crawlers.
 *  - "Separate sitemaps by entity/content type rather than one massive
 *    sitemap." Today the platform has one public content type on this
 *    surface — the twelve singleton pages — so one sitemap *is* the split.
 *    When a second public read appears (articles, clubs, results), it gets
 *    its own file via `generateSitemaps` rather than being appended here.
 *
 * Each entry carries its language alternates, which is §10's requirement
 * expressed in the sitemap as well as in the page head — Google reads both,
 * and a disagreement between them is worse than either alone.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of PUBLIC_PAGES) {
    if (!(await isIndexable(page))) continue;

    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(locale, page.route),
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((other) => [other, absoluteUrl(other, page.route)]),
          ),
        },
      });
    }
  }

  return entries;
}
