import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo/metadata";

/**
 * Chapter 14 §13 points crawlers at the sitemap; nothing in the chapter asks
 * for a disallow list, and nothing on this surface warrants one — the whole
 * public site is meant to be indexed, and the pages that are not ready say so
 * per-page with `noindex` (§11) rather than being hidden here.
 *
 * That distinction matters: a URL blocked in `robots.txt` cannot be crawled,
 * so its `noindex` is never read, and Google may keep indexing it from
 * inbound links alone. Blocking is the wrong tool for "not ready yet".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
