import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPreparingPageMetadata } from "@/components/pages/preparing-page-screen";
import { redirect } from "@/i18n/navigation";
import { fetchCurrentSeasonSlug } from "@/lib/seasons/current-season";
import type { AppLocale } from "@/i18n/routing";

/**
 * `/seasons/current` — a redirect, not a page (spec §4.3).
 *
 * It sends the reader to the current season, or to the archive when no season
 * is current or the API cannot say which one is. It stays a `page.tsx` rather
 * than a route handler because the header links here and
 * `internal-links-contract.spec.ts` requires a page file behind every link.
 *
 * Its metadata stays the `PREPARING_PAGES` entry's `noindex`: a redirecting
 * address has nothing of its own to index. Rendered per request, so the
 * redirect follows the current season within the API read's cache window.
 */

export const dynamic = "force-dynamic";

const KEY = "current-season";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPreparingPageMetadata(KEY, locale);
};

const CurrentSeasonPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const slug = await fetchCurrentSeasonSlug();
  return redirect({ href: slug ? `/seasons/${encodeURIComponent(slug)}` : "/seasons", locale });
};

export default CurrentSeasonPage;
