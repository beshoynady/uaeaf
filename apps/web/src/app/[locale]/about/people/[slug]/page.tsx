import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProfileScreen } from "@/components/pages/governance/profile/profile-screen";
import { governanceV2Enabled } from "@/lib/governance/flag";
import { samplePersonProfile } from "@/lib/governance/sample-data";
import { buildMetadata } from "@/lib/seo/metadata";
import type { AppLocale } from "@/i18n/routing";

/**
 * One person, at `/about/people/<slug>`.
 *
 * Reached from the board page, a committee's members, and another profile's
 * closing scene — there is no `/about/people` index, because the federation
 * publishes people through the bodies they serve on rather than as a
 * directory.
 *
 * Behind `NEXT_PUBLIC_GOVERNANCE_V2` and 404 without it, and `noindex` while
 * the switch is on: the records are placeholder until the personnel endpoints
 * land, and a person's name is exactly the kind of text that must not be
 * indexed as a placeholder.
 */
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> => {
  const { locale, slug } = await params;
  if (!governanceV2Enabled()) return { robots: { index: false, follow: false } };

  const profile = samplePersonProfile(slug);
  if (!profile) return { robots: { index: false, follow: true } };

  const t = await getTranslations({ locale, namespace: "Board" });
  return buildMetadata({
    locale,
    route: `/about/people/${slug}`,
    title: profile.person.name[locale],
    description: profile.person.bio?.[locale] ?? t("title"),
    indexable: false,
  });
};

const PersonPage = async ({ params }: { params: Promise<{ locale: AppLocale; slug: string }> }) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!governanceV2Enabled()) notFound();

  const profile = samplePersonProfile(slug);
  if (!profile) notFound();

  return <ProfileScreen profile={profile} locale={locale} />;
};

export default PersonPage;
