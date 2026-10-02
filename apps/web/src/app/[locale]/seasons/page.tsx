import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@uaeaf/brand-ui";
import { HeroTitle } from "@/components/pages/albums/hero-title";
import { SeasonsArchive } from "@/components/pages/seasons/seasons-archive-grid";
import { Section } from "@/components/ui/section";
import { fetchPublicMedia } from "@/lib/api/media";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import { loadSeasonArchive } from "@/lib/seasons/load";
import { fetchSeasonStats } from "@/lib/seasons/season-stats";
import { buildMetadata } from "@/lib/seo/metadata";
import { BreadcrumbJsonLd, CollectionPageJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";

/**
 * `/seasons` — the seasons archive (spec §4.2).
 *
 * The heading and description are static copy: no `seasonsPage` hero record
 * exists (spec §4.2, deferred owner decision). Indexed only once a season is
 * published (`isIndexable`), so the page and the sitemap agree.
 *
 * Rendered per request: which season counts as upcoming depends on the day.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";

const KEY = "seasons";

const page = () => {
  const entry = findPublicPage(KEY);
  if (!entry) throw new Error(`No public page registered for "${KEY}"`);
  return entry;
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const [t, site, indexable] = await Promise.all([
    getTranslations({ locale, namespace: "Seasons" }),
    getTranslations({ locale, namespace: "Metadata" }),
    isIndexable(page()),
  ]);

  return buildMetadata({
    locale,
    route: page().route,
    title: `${t("archive.title")} | ${site("title")}`,
    description: t("seo.archiveDescription"),
    indexable,
  });
};

const SeasonsPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const [seasons, t, tPages, tNav] = await Promise.all([
    loadSeasonArchive(),
    getTranslations({ locale, namespace: "Seasons" }),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
  ]);
  const list = seasons ?? [];
  const [stats, logos] = await Promise.all([
    Promise.all(list.map(async (season) => [season.slug, await fetchSeasonStats(season.slug)] as const)),
    fetchPublicMedia(list.map((season) => season.logoId)),
  ]);

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        trail={[
          { name: tNav("home"), route: "/" },
          { name: tPages("seasons"), route: page().route },
        ]}
      />
      <CollectionPageJsonLd
        locale={locale}
        route={page().route}
        name={t("archive.title")}
        description={t("archive.description")}
        items={list.map((season) => season.name[locale])}
      />

      <PageHero
        title={<HeroTitle>{t("archive.title")}</HeroTitle>}
        description={t("archive.description")}
        breadcrumb={[{ label: tNav("home"), href: `/${locale}` }, { label: tPages("seasons") }]}
        breadcrumbLabel={tPages("breadcrumbLabel")}
      />

      <Section className="py-16">
        <SeasonsArchive seasons={seasons} stats={new Map(stats)} logos={logos} now={new Date()} locale={locale} />
      </Section>
    </>
  );
};

export default SeasonsPage;
