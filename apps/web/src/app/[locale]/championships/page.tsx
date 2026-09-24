import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPreparingPageMetadata } from "@/components/pages/preparing-page-screen";
import { ChampionshipsScreen } from "@/components/pages/championships/championships-screen";
import type { AppLocale } from "@/i18n/routing";

/** `/championships`: in preparation (`PREPARING_PAGES`) until its full page replaces this file at the same route. */
const KEY = "championships";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPreparingPageMetadata(KEY, locale);
};

const ChampionshipsPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChampionshipsScreen locale={locale} />;
};

export default ChampionshipsPage;
