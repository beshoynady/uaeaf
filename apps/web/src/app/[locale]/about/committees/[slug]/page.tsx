import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CommitteeScreen } from "@/components/pages/governance/committee/committee-screen";
import { governanceV2Enabled } from "@/lib/governance/flag";
import { sampleCommittee } from "@/lib/governance/sample-data";
import { buildMetadata } from "@/lib/seo/metadata";
import type { AppLocale } from "@/i18n/routing";

/**
 * One committee, at `/about/committees/<slug>`.
 *
 * Behind `NEXT_PUBLIC_GOVERNANCE_V2` and 404 without it, because the committee
 * endpoints do not exist yet and the page reads a sample module in their place
 * (`lib/governance/sample-data.ts`). A 404 rather than a page in preparation:
 * the address is not one the federation has published, so answering it at all
 * would put a URL into circulation that has to keep working.
 *
 * `noindex` while the switch is on, for the same reason — the content is
 * placeholder, and Chapter 14 §11 keeps a page without meaningful text out of
 * the index. When the endpoints land, the switch and the sample go together
 * and this route reads the API.
 */
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> => {
  const { locale, slug } = await params;
  if (!governanceV2Enabled()) return { robots: { index: false, follow: false } };

  const committee = sampleCommittee(slug);
  if (!committee) return { robots: { index: false, follow: true } };

  const t = await getTranslations({ locale, namespace: "CommitteesIndex" });
  return buildMetadata({
    locale,
    route: `/about/committees/${slug}`,
    title: committee.name[locale],
    description: committee.summary?.[locale] ?? t("title"),
    indexable: false,
  });
};

const CommitteePage = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!governanceV2Enabled()) notFound();

  const committee = sampleCommittee(slug);
  if (!committee) notFound();

  return <CommitteeScreen committee={committee} locale={locale} />;
};

export default CommitteePage;
