import { useTranslations } from "next-intl";
import { PageHero } from "@uaeaf/brand-ui";
import { HeroTitle } from "@/components/pages/albums/hero-title";
import { heroPhotoSlot } from "@/components/ui/hero-photo";
import { formatSeasonRange, isoDay } from "@/lib/seasons/season-days";
import type { SeasonPhase, SeasonPublic } from "@/lib/seasons/types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { SeasonBadges } from "./season-badges";
import { SeasonMark } from "./season-mark";

/**
 * A season's hero: the black register's ink band (`public-pages.ts`, the
 * pattern `/about/governance/policies` set), or the banner under the kit's
 * scrim when the season has one. The trail, the name and its tagline, the
 * current-season and current-phase badges, the inclusive date range, and the
 * logo or its short-name stand-in.
 *
 * The two actions the design draws are not rendered. The calendar PDF is a
 * `documents` record with no public read, and the season agenda's destination
 * belongs to public events, which do not exist yet; a button that leads
 * nowhere is worse than none (spec §4.1).
 */
export const SeasonHero = ({
  season,
  banner,
  logo,
  runningPhases,
  locale,
}: {
  season: SeasonPublic;
  banner: MediaAssetPublic | undefined;
  logo: MediaAssetPublic | undefined;
  runningPhases: readonly SeasonPhase[];
  locale: AppLocale;
}) => {
  const tNav = useTranslations("Nav");
  const tPages = useTranslations("Pages");
  const name = season.name[locale];
  const tagline = season.tagline?.[locale]?.trim();

  return (
    <PageHero
      title={<HeroTitle>{name}</HeroTitle>}
      description={tagline || undefined}
      media={heroPhotoSlot(banner, locale)}
      breadcrumb={[
        { label: tNav("home"), href: `/${locale}` },
        { label: tPages("seasons"), href: `/${locale}/seasons` },
        { label: name },
      ]}
      breadcrumbLabel={tPages("breadcrumbLabel")}
      slot={
        <div className="flex flex-wrap items-center gap-6">
          <SeasonMark logo={logo} shortName={season.shortName} locale={locale} size="lg" />
          <div className="flex min-w-0 flex-col gap-3">
            <SeasonBadges isCurrent={season.isCurrent} phases={runningPhases} locale={locale} />
            <p className="text-body text-[color:var(--surface-text)]">
              <time dateTime={`${isoDay(season.startDate)}/${isoDay(season.endDate)}`}>
                {formatSeasonRange(season.startDate, season.endDate, locale)}
              </time>
            </p>
          </div>
        </div>
      }
    />
  );
};
