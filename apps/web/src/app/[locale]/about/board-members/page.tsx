import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  StaticPageScreen,
  buildStaticPageMetadata,
  loadStaticPage,
  text,
} from "@/components/pages/static-page-screen";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { fetchPublic } from "@/lib/api/public-client";
import type { FederationPersonnelPublic } from "@/lib/api/types";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "board-members";

/** `GET /federation-personnel/public` returns Active personnel only, in a
 *  public-safe shape that structurally omits `internalContact`. It is one of
 *  only two public list endpoints these twelve pages can draw on. */
async function loadMembers(): Promise<FederationPersonnelPublic[]> {
  const members = await fetchPublic<FederationPersonnelPublic[]>("/federation-personnel/public");
  return Array.isArray(members) ? members : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Chapter 14 §11, decided in `indexability.ts` so this page's robots
  // directive and its row in the sitemap cannot disagree.
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
}

export default async function BoardMembersPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [{ title, subtitle }, members] = await Promise.all([
    loadStaticPage(KEY, locale),
    loadMembers(),
  ]);
  const t = await getTranslations({ locale, namespace: "Sections" });

  return (
    <StaticPageScreen
      pageKey={KEY}
      locale={locale}
      title={title}
      subtitle={subtitle}
      itemNames={members.map((member) => member.fullName[locale])}
    >
      {members.length > 0 ? (
        <Section labelledBy="board-members-heading" className="py-12 md:py-16">
          <h2 id="board-members-heading" className="text-h2">
            {t("boardMembers")}
          </h2>
          {/* Chapter 5 §5.2's column counts, read as content columns: 4 at
              xs/sm, 8 at md, 12 at lg+. One card per 4 columns gives 1 · 2 · 3
              — an exact division of a documented number at every step rather
              than a count chosen by eye. */}
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <li key={member.id} className="rise-scroll">
                <Card className="h-full">
                  <h3 className="text-h4">{member.fullName[locale]}</h3>
                  {member.shortBio ? (
                    <p className="mt-2 text-body-sm text-[color:var(--color-text-secondary)]">
                      {text(member.shortBio, locale)}
                    </p>
                  ) : null}
                  {member.publicContact?.email ? (
                    <a
                      href={`mailto:${member.publicContact.email}`}
                      dir="ltr"
                      className="mt-4 inline-flex min-h-11 items-center rounded-xs text-body-sm text-[color:var(--color-brand-primary)] underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
                    >
                      {member.publicContact.email}
                    </a>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </StaticPageScreen>
  );
}
