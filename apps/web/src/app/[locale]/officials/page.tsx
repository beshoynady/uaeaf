import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPreparingPageMetadata } from "@/components/pages/preparing-page-screen";
import { OfficialsScreen } from "@/components/pages/officials/officials-screen";
import type { AppLocale } from "@/i18n/routing";

/** `/officials`: in preparation (`PREPARING_PAGES`) until its full page replaces this file at the same route. */
const KEY = "officials";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPreparingPageMetadata(KEY, locale);
};

const OfficialsPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OfficialsScreen locale={locale} />;
};

export default OfficialsPage;
