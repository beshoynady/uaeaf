import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { BoardMembersScreen } from "@/components/pages/board-members/board-members-screen";
import { BoardScreen } from "@/components/pages/governance/board/board-screen";
import { buildStaticPageMetadata } from "@/components/pages/static-page-screen";
import { governanceV2Enabled } from "@/lib/governance/flag";
import { sampleBoardPage } from "@/lib/governance/sample-data";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";
import { withheldPage } from "@/components/pages/page-inactive-screen";

const KEY = "board-members";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // Chapter 14 §11, decided in `indexability.ts` so this page's robots
  // directive and its row in the sitemap cannot disagree. The rebuilt screen
  // is the exception: it reads placeholder records, so it is never indexable
  // whatever the page's own state says.
  const indexable = governanceV2Enabled()
    ? false
    : await isIndexable(findPublicPage(KEY)!);
  return buildStaticPageMetadata(KEY, locale, indexable);
};

const BoardMembersPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  // Switched off by the federation: the address stays, the content does not
  // (ADR-0102 §D2).
  const withheld = await withheldPage(KEY, locale);
  if (withheld) return withheld;

  // The rebuilt page, on the sample records, while its endpoints are written.
  // Off — the default — the screen that reads `/federation-appointments/public`
  // is served unchanged, so real names never give way to placeholders.
  if (governanceV2Enabled()) {
    return <BoardScreen board={sampleBoardPage()} locale={locale} />;
  }

  return <BoardMembersScreen locale={locale} />;
};

export default BoardMembersPage;
