import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  StaticPageScreen,
  buildStaticPageMetadata,
  loadStaticPage,
} from "@/components/pages/static-page-screen";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { fetchPublic } from "@/lib/api/public-client";
import type { AthletePublic, Paginated } from "@/lib/api/types";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "athletes";

/**
 * `GET /athletes/public` — a paginated, public-safe list.
 *
 * The response deliberately omits `dateOfBirth` upstream (ADR-0028 / Federal
 * Law 26/2025 on minors' data); it is absent from the type as well as from
 * the render, so it cannot be reintroduced by accident here.
 *
 * `nationalityId` and `disciplineIds` come back as raw references. Neither
 * `nationalities` nor `disciplines` exposes a public read, so this page shows
 * the name and the federation and not the discipline chips the directory will
 * eventually want. Showing an unresolved ObjectId would be worse than showing
 * nothing.
 */
async function loadAthletes(): Promise<AthletePublic[]> {
  const response = await fetchPublic<Paginated<AthletePublic>>("/athletes/public");
  return Array.isArray(response?.items) ? response.items : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
}

export default async function AthletesPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [{ title, subtitle, heroImage }, athletes] = await Promise.all([
    loadStaticPage(KEY, locale),
    loadAthletes(),
  ]);
  const t = await getTranslations({ locale, namespace: "Sections" });

  return (
    <StaticPageScreen
      pageKey={KEY}
      locale={locale}
      title={title}
      subtitle={subtitle}
      heroImage={heroImage}
      itemNames={athletes.map((athlete) => athlete.name[locale])}
    >
      {athletes.length > 0 ? (
        <Section
          labelledBy="athletes-heading"
          className="bg-[color:var(--color-surface-sunken)] py-12 md:py-16"
        >
          <h2 id="athletes-heading" className="text-h2">
            {t("registeredAthletes")}
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {athletes.map((athlete) => (
              <li key={athlete.id} className="rise-scroll">
                <Card className="h-full">
                  <h3 className="text-h4">{athlete.name[locale]}</h3>
                  {athlete.federationName ? (
                    <p className="mt-2 text-body-sm text-[color:var(--color-text-secondary)]">
                      {athlete.federationName[locale]}
                    </p>
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
