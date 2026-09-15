import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PreparingPageScreen, buildPreparingPageMetadata } from "@/components/pages/preparing-page-screen";
import type { AppLocale } from "@/i18n/routing";

/** `/privacy`: in preparation (`PREPARING_PAGES`) until its full page replaces this file at the same route. */
const KEY = "privacy";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPreparingPageMetadata(KEY, locale);
};

const PrivacyPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PreparingPageScreen pageKey={KEY} locale={locale} />;
};

export default PrivacyPage;
