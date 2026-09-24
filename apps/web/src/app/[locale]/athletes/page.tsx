import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { AthletesScreen } from "@/components/pages/athletes/athletes-screen";
import { buildStaticPageMetadata } from "@/components/pages/static-page-screen";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "athletes";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
};

const AthletesPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AthletesScreen locale={locale} />;
};

export default AthletesPage;
