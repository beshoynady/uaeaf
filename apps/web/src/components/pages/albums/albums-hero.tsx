import { useTranslations } from "next-intl";
import { PageHero } from "@uaeaf/brand-ui";
import type { BreadcrumbItem } from "@uaeaf/brand-ui";
import { breadcrumbTrail } from "@/components/pages/static-page-screen";
import { heroPhotoSlot } from "@/components/ui/hero-photo";
import { findPublicPage } from "@/lib/pages/public-pages";
import type { AlbumStats } from "@/lib/albums/album-types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { HeroTitle } from "./hero-title";

/**
 * The gallery's hero: the kit's `PageHero` with the archive's three figures in
 * its slot.
 *
 * The page record's photograph, where it has one, is passed as `media`, which
 * is what chooses the photographic composition (owner decision recorded on
 * `PageHero`). The title and sentence are the record's own, as on every other
 * listing page.
 *
 * -- The visible trail -------------------------------------------------------
 *
 * The canvas draws «الرئيسية / المركز الإعلامي / معرض الصور». The Media Centre
 * has no page of its own (IA §8.1), and the kit marks every step without a
 * link as the current page, so drawing it would tell a screen reader there are
 * two current pages. It is left out here exactly as `EditorialHero` leaves it
 * out, and out of the structured trail too, which has no address to give it.
 *
 * -- The figures ---------------------------------------------------------------
 *
 * Exact counts, not the canvas's rounded «+128»: a plus sign on a number the
 * API has just counted would be a claim about albums nobody has published. An
 * archive with no albums shows no figures at all — a hero announcing zero is
 * a hole, not a statistic.
 *
 * -- The overlap ---------------------------------------------------------------
 *
 * When a featured album follows, it is pulled 110px up over the hero's foot
 * (the canvas's `margin-top: -110px`). The same 110px is reserved here under
 * the figures, so the card covers the hero's own ground and never its words.
 */
export const AlbumsHero = ({
  locale,
  title,
  subtitle,
  heroImage,
  stats,
  overlapped,
}: {
  locale: AppLocale;
  title: string;
  subtitle: string | null;
  heroImage: MediaAssetPublic | undefined;
  stats: AlbumStats | null;
  /** A featured album will be laid over the hero's foot. */
  overlapped: boolean;
}) => {
  const tPages = useTranslations("Pages");
  const tNav = useTranslations("Nav");
  const t = useTranslations("albums.page.stats");

  const page = findPublicPage("albums")!;
  const href = (route: string) =>
    route === "/" ? `/${locale}` : `/${locale}${route}`;
  const breadcrumb: BreadcrumbItem[] = breadcrumbTrail(
    page,
    (key) => tPages(key),
    (key) => tNav(key),
  )
    .filter((crumb) => crumb.route !== null)
    .map((crumb, index, all) =>
      index === all.length - 1
        ? { label: title }
        : { label: crumb.name, href: href(crumb.route!) },
    );

  // Latin digits, pinned (Chapter 19 §5), grouped the way the canvas groups «2,400».
  const digits = new Intl.NumberFormat(locale, { numberingSystem: "latn" });
  // In the canvas's order: the occasions lead, in the green ink tier, because
  // they are what the archive is organised by. Green only on the ink band:
  // `--surface-accent` is measured against the ink ground and against nothing
  // else, and over a photograph the scrim is measured for white alone.
  const accent = heroImage === undefined;
  const figures =
    stats && stats.albums > 0
      ? [
          { key: "occasions", value: stats.occasions, accent },
          { key: "photos", value: stats.photos, accent: false },
          { key: "albums", value: stats.albums, accent: false },
        ]
      : [];

  const slot =
    figures.length > 0 || overlapped ? (
      <div className={overlapped ? "pb-[110px]" : undefined}>
        {figures.length > 0 ? (
          <ul
            aria-label={t("label")}
            className="grid grid-cols-3 gap-3 sm:inline-grid"
          >
            {figures.map((figure) => (
              <li
                key={figure.key}
                className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--surface-tile-edge)] bg-[color:var(--surface-tile-fill)] px-5 py-3"
              >
                {/* The number first on screen, and first when read: "35
                    championships and events" is the sentence it is. */}
                <span
                  className={`text-h3 font-bold tabular-nums ${
                    figure.accent
                      ? "text-[color:var(--surface-accent)]"
                      : "text-[color:var(--surface-text)]"
                  }`}
                >
                  {digits.format(figure.value)}
                </span>
                {/* The surface's primary ink, not its muted tier: over a
                    photograph the scrim is measured for white alone. */}
                <span className="text-caption text-[color:var(--surface-text)]">
                  {t(figure.key)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    ) : undefined;

  return (
    <PageHero
      title={<HeroTitle>{title}</HeroTitle>}
      description={subtitle ?? undefined}
      media={heroPhotoSlot(heroImage, locale)}
      breadcrumb={breadcrumb}
      breadcrumbLabel={tPages("breadcrumbLabel")}
      slot={slot}
    />
  );
};
