import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPreparingPageMetadata, PreparingPageScreen } from "@/components/pages/preparing-page-screen";
import type { AppLocale } from "@/i18n/routing";

/** `/national-teams`: in preparation (`PREPARING_PAGES`) until its full page replaces this file at the same route. */
const KEY = "national-teams";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPreparingPageMetadata(KEY, locale);
};

const NationalTeamsPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PreparingPageScreen pageKey={KEY} locale={locale} />;
};

export default NationalTeamsPage;
