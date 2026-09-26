import { useTranslations } from "next-intl";
import { BRAND_VISUALLY_HIDDEN, PageHero } from "@uaeaf/brand-ui";
import type { BreadcrumbItem } from "@uaeaf/brand-ui";
import { PublishDate } from "@/components/pages/news/publish-date";
import { AssociationChips } from "@/components/shared/albums/association-chips";
import { heroPhotoSlot } from "@/components/ui/hero-photo";
import type { AlbumAffiliation } from "@/lib/albums/affiliations";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { AlbumHeroActions } from "./album-hero-actions";
import { HeroTitle } from "./hero-title";
import { CalendarIcon, PhotoIcon, PinIcon } from "./meta-icons";

/**
 * One album's hero (approved canvases `albumview-*.png`): the cover as the
 * photograph, the trail, the title and its dash, a meta row, the occasion
 * chips, and the two buttons.
 *
 * -- What the canvas shows that is not drawn ---------------------------------
 *
 * - The photographing body in the meta row («المركز الإعلامي للاتحاد»). The
 *   public album carries no such field, and the owner's credit rule is that a
 *   credit is printed only where one exists — never as a placeholder. The
 *   row carries date, place and photo count, each only where the album has it.
 * - Athlete, club and season chips. `AssociationChips` names occasions only
 *   (championship, competition, public event); drawing people and clubs is a
 *   change to that shared component, recorded for its owner rather than
 *   imitated here with its classes.
 */
export const AlbumHero = ({
  locale,
  title,
  eventDate,
  place,
  photoCount,
  affiliations,
  cover,
  breadcrumb,
  viewerId,
}: {
  locale: AppLocale;
  title: string;
  eventDate: string | null;
  place?: string;
  photoCount: number;
  affiliations: readonly AlbumAffiliation[];
  cover: MediaAssetPublic | undefined;
  breadcrumb: BreadcrumbItem[];
  viewerId: string;
}) => {
  const t = useTranslations("albums.page.album");
  const tCard = useTranslations("albums.card");
  const tPages = useTranslations("Pages");

  return (
    <PageHero
      title={<HeroTitle>{title}</HeroTitle>}
      media={heroPhotoSlot(cover, locale)}
      breadcrumb={breadcrumb}
      breadcrumbLabel={tPages("breadcrumbLabel")}
      slot={
        <div className="flex flex-col gap-5">
          <ul
            aria-label={t("metaLabel")}
            className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-[color:var(--surface-text)]"
          >
            {eventDate ? (
              <li className="flex items-center gap-2">
                <CalendarIcon />
                <span className={BRAND_VISUALLY_HIDDEN}>{t("date")}: </span>
                <PublishDate date={eventDate} />
              </li>
            ) : null}
            {place ? (
              <li className="flex items-center gap-2">
                <PinIcon />
                <span className={BRAND_VISUALLY_HIDDEN}>{t("place")}: </span>
                {place}
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <PhotoIcon />
              <span className={BRAND_VISUALLY_HIDDEN}>{t("photos")}: </span>
              {tCard("photoCount", { count: photoCount })}
            </li>
          </ul>

          <AssociationChips items={affiliations} placement="hero" />

          <AlbumHeroActions viewerId={viewerId} hasPhotos={photoCount > 0} />
        </div>
      }
    />
  );
};
