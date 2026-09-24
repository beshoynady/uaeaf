import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { BoardMembersScreen } from "@/components/pages/board-members/board-members-screen";
import { buildStaticPageMetadata } from "@/components/pages/static-page-screen";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "board-members";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // Chapter 14 §11, decided in `indexability.ts` so this page's robots
  // directive and its row in the sitemap cannot disagree.
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
};

const BoardMembersPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BoardMembersScreen locale={locale} />;
};

export default BoardMembersPage;
