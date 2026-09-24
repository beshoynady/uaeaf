import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { PoliciesScreen } from "@/components/pages/policies/policies-screen";
import { buildStaticPageMetadata } from "@/components/pages/static-page-screen";
import { findPublicPage } from "@/lib/pages/public-pages";
import type { AppLocale } from "@/i18n/routing";

/**
 * `/about/governance/policies` — Regulations & Policies.
 *
 * The first page assembled entirely from `@uaeaf/brand-ui` (ADR-0098 D7), and
 * the reference for the ones that follow: every surface, accent, control and
 * card on it comes from the library, and this file contains no colour, no
 * gradient and no layout of its own.
 *
 * **`noindex`, deliberately.** Chapter 14 §11 keeps a page out of the index
 * until it carries real content, and this one carries clearly-marked seed
 * records: `governanceDocuments` exists and has a public read for a *single*
 * document, but no public list route, so a public page cannot enumerate them.
 * The registry entry records that gap, and `listEndpoint: null` is what drives
 * the flag — so the page indexes itself the day the endpoint is opened, with no
 * edit here.
 */
const KEY = "policies";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // `false` rather than `isIndexable(...)`: this page's content is seed data
  // and stays out of the index until a public list endpoint serves the real
  // documents. Stated here rather than derived, because the reason is the
  // missing endpoint, not the absence of a saved record.
  return buildStaticPageMetadata(KEY, locale, false);
};

const PoliciesPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  // Registered in `PUBLIC_PAGES`; the lookup is here so a missing entry fails
  // loudly in development rather than rendering a page with no register.
  findPublicPage(KEY);

  return <PoliciesScreen locale={locale} />;
};

export default PoliciesPage;
