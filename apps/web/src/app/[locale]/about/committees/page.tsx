import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { CommitteesScreen } from "@/components/pages/committees/committees-screen";
import { buildStaticPageMetadata } from "@/components/pages/static-page-screen";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";
import { withheldPage } from "@/components/pages/page-inactive-screen";

const KEY = "committees";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // Chapter 14 §11: the intro heading and body are this page's "meaningful
  // textual description". Without a saved record there is nothing but a
  // hero, so it stays out of the index.
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
};

const CommitteesPageRoute = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  // Switched off by the federation: the address stays, the content does not
  // (ADR-0102 §D2).
  const withheld = await withheldPage(KEY, locale);
  if (withheld) return withheld;

  return <CommitteesScreen locale={locale} />;
};

export default CommitteesPageRoute;
