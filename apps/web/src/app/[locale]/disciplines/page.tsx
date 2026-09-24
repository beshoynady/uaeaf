import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DisciplinesScreen } from "@/components/pages/disciplines/disciplines-screen";
import { buildStaticPageMetadata } from "@/components/pages/static-page-screen";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "disciplines";

/**
 * Chapter 14 §11 — Minimum Content Threshold.
 *
 * `disciplines` exposes no `@Public()` read upstream.
 *
 * §11's ruling on exactly this situation: a page that does not meet the
 * threshold "MAY exist internally within the platform but SHOULD remain
 * temporarily `noindex` until the required content is complete." So the page
 * ships — its hero is real, editor-managed content and the URL is stable —
 * and it stays out of the index until there is a list to show. It is
 * `noindex, follow`, not `nofollow`: the footer and navigation links on it
 * are still worth crawling.
 *
 * The decision itself lives in `lib/pages/indexability.ts`, so this page's
 * robots directive and its presence in the sitemap (§13) are read from one
 * function and cannot disagree.
 */

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
};

const DisciplinesPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DisciplinesScreen locale={locale} />;
};

export default DisciplinesPage;
