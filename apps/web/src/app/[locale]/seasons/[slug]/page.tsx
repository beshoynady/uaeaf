import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SeasonAbout } from "@/components/pages/seasons/season-about";
import { SeasonEventsSection } from "@/components/pages/seasons/season-events-section";
import { SeasonHero } from "@/components/pages/seasons/season-hero";
import { SeasonMediaSection } from "@/components/pages/seasons/season-media-section";
import { SeasonNav } from "@/components/pages/seasons/season-nav";
import { SeasonStatsRow } from "@/components/pages/seasons/season-stats-row";
import { SeasonTimeline } from "@/components/pages/seasons/season-timeline";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@uaeaf/brand-ui";
import { fetchPublicMedia } from "@/lib/api/media";
import { loadThumbnails } from "@/lib/video/load";
import { loadSeason, loadSeasonArchive, neighboursOf } from "@/lib/seasons/load";
import { formatSeasonDate } from "@/lib/seasons/season-days";
import { loadSeasonAlbums, loadSeasonVideos, seasonLabelOf, statsFrom } from "@/lib/seasons/season-stats";
import { currentPhases } from "@/lib/seasons/timeline";
import { buildMetadata } from "@/lib/seo/metadata";
import { BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { withShareImage } from "@/app/[locale]/media/albums/_data/seo";
import type { AppLocale } from "@/i18n/routing";

/**
 * One season, at `/seasons/<slug>` (spec §4.1).
 *
 * A slug that names no public season is a 404: the API answers `null` for a
 * draft, a hidden season and a slug nobody used alike, and `fetchPublic`
 * answers `null` when the API is down, so none of them discloses which it is.
 *
 * Rendered per request, because the current phase and today's line on the
 * timeline depend on the day; the reads underneath are cached for
 * `PUBLIC_REVALIDATE_SECONDS`.
 *
 * Not drawn, with the reason recorded in the report rather than a placeholder
 * on the page: the season's documents and calendar PDF (`documents` has no
 * public read) and its sponsor (the public sponsorship read carries no target
 * id to match a season by).
 */

export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";

/** Two of each, as the design draws them beside each other. */
const MEDIA_PREVIEW = 2;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> => {
  const { locale, slug } = await params;
  const season = await loadSeason(slug);
  if (!season) return { robots: { index: false, follow: true } };

  const [t, site] = await Promise.all([
    getTranslations({ locale, namespace: "Seasons.seo" }),
    getTranslations({ locale, namespace: "Metadata" }),
  ]);
  const name = season.name[locale];
  const title = season.seo?.metaTitle?.[locale]?.trim() || name;
  // The share card: the season's own share image, else the SEO image, else the banner.
  const shareId = season.shareImageId ?? season.seo?.ogImageId ?? season.bannerId;
  const media = await fetchPublicMedia([shareId]);

  return withShareImage(
    buildMetadata({
      locale,
      route: `/seasons/${season.slug}`,
      title: `${title} | ${site("title")}`,
      description: season.seo?.metaDescription?.[locale]?.trim() || t("seasonDescription", { name }),
      indexable: true,
    }),
    shareId ? media.get(shareId) : undefined,
    locale,
  );
};

const SeasonPage = async ({ params }: { params: Promise<{ locale: AppLocale; slug: string }> }) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const season = await loadSeason(slug);
  if (!season) notFound();

  const now = new Date();
  const [albums, videoCount, videoList, archive, media, t, tPages, tNav] = await Promise.all([
    loadSeasonAlbums(season.slug, MEDIA_PREVIEW),
    loadSeasonVideos(season.slug, 1),
    loadSeasonVideos(season.slug, MEDIA_PREVIEW, "video"),
    loadSeasonArchive(),
    fetchPublicMedia([season.bannerId, season.logoId]),
    getTranslations({ locale, namespace: "Seasons" }),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
  ]);
  const thumbnails = await loadThumbnails(videoList?.items ?? []);
  const { previous, next } = neighboursOf(archive ?? [], season.slug);
  const label = seasonLabelOf(season.slug);

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        trail={[
          { name: tNav("home"), route: "/" },
          { name: tPages("seasons"), route: "/seasons" },
          { name: season.name[locale], route: `/seasons/${season.slug}` },
        ]}
      />

      <SeasonHero
        season={season}
        banner={season.bannerId ? media.get(season.bannerId) : undefined}
        logo={season.logoId ? media.get(season.logoId) : undefined}
        runningPhases={currentPhases(season.phases, now)}
        locale={locale}
      />

      <SeasonStatsRow stats={statsFrom(albums, videoCount)} locale={locale} />

      <Section labelledBy="season-phases-heading" className="py-16">
        <div className="flex flex-col gap-8">
          <SectionHeading
            title={<span id="season-phases-heading">{t("timeline.heading")}</span>}
            description={t("timeline.span", {
              start: formatSeasonDate(season.startDate, locale, "month"),
              end: formatSeasonDate(season.endDate, locale, "month"),
            })}
          />
          <SeasonTimeline
            phases={season.phases}
            keyDates={season.keyDates}
            startDate={season.startDate}
            endDate={season.endDate}
            now={now}
            locale={locale}
          />
        </div>
      </Section>

      <SeasonEventsSection ground="sunken" />

      <SeasonMediaSection
        albums={albums?.items ?? null}
        videos={videoList?.items ?? null}
        thumbnails={thumbnails}
        albumsHref={label ? `/media/albums?${new URLSearchParams({ season: label })}` : null}
        videosHref={label ? `/media/videos?${new URLSearchParams({ season: season.slug })}` : null}
        locale={locale}
        ground="base"
      />

      <SeasonAbout season={season} now={now} locale={locale} ground="sunken" />

      <SeasonNav previous={previous} next={next} locale={locale} ground="base" />
    </>
  );
};

export default SeasonPage;
