import type { MetadataRoute } from "next";
import { fetchArticleSitemap } from "@/lib/api/articles";
import { absoluteUrl } from "@/lib/seo/metadata";
import { routing } from "@/i18n/routing";

/**
 * Chapter 14 §13 — the news stories' own sitemap.
 *
 * §13 asks for separate sitemaps by content type rather than one file for the
 * whole site, and names `sitemap-news.xml` among them. Until now the twelve
 * singleton pages were the only public content and one file was the split;
 * articles are the second type, so they get their own rather than being
 * appended to the pages' one.
 *
 * Two of §13's rules shape what goes in it:
 *
 *  - "Content in any state other than Published MUST NOT appear in any
 *    Sitemap." The endpoint answers only live, unhidden articles, so a draft
 *    cannot reach this file — and an archived one, hidden from the feed,
 *    cannot either.
 *  - Every entry carries its language alternates, which is §10's requirement
 *    expressed in the sitemap as well as in the page head. Google reads both,
 *    and a disagreement between them is worse than either alone.
 *
 * `lastModified` is the article's own last edit where there is one, falling
 * back to its publication date — never `now`, which would tell a crawler every
 * story changed on every crawl.
 */
export const revalidate = 3600;

export default async function sitemapNews(): Promise<MetadataRoute.Sitemap> {
  const articles = await fetchArticleSitemap();
  const entries: MetadataRoute.Sitemap = [];

  for (const article of articles) {
    const route = `/news/${article.slug}`;
    const lastModified = article.updatedAt ?? article.publishDate;

    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(locale, route),
        ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((other) => [other, absoluteUrl(other, route)]),
          ),
        },
      });
    }
  }

  return entries;
}
