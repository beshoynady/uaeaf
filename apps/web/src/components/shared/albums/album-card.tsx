import { useId } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_FOCUSABLE, BRAND_FOCUS_WIDE, BRAND_VISUALLY_HIDDEN, BrandBorder, Surface } from "@uaeaf/brand-ui";
import { PublishDate } from "@/components/pages/news/publish-date";
import { AssociationChips } from "./association-chips";
import { PhotoStack } from "./photo-stack";
import type { AlbumCardProps } from "./types";
import "./albums.css";

/**
 * One album in a grid: its photo stack, title, date and place, and a footer
 * that says how many photographs are inside.
 *
 * -- One link, one tab stop --------------------------------------------------
 *
 * The whole card is the link, because the whole card is one destination. A
 * separate "browse" link beside a linked title would give a keyboard reader
 * two stops per card that go to the same place — sixteen for a page of eight.
 * "Browse album" is therefore the link's visual affordance rather than a link
 * of its own, and the accessible name is the title alone; the date, place and
 * count are its description, so a screen reader hears the name first.
 *
 * -- Width-agnostic ------------------------------------------------------------
 *
 * The card fills the cell it is given and says nothing about columns. The
 * four-across desktop grid and the single phone column belong to the page.
 *
 * Server Component: the ring's rotation and the stack's fan are both CSS on
 * hover and on focus inside, and there is no state.
 */
export const AlbumCard = ({
  album,
  locale,
  affiliations = [],
  href,
  headingLevel = "h3",
  className,
}: AlbumCardProps) => {
  const t = useTranslations("albums.card");
  const titleId = useId();
  const detailsId = useId();
  const Heading = headingLevel;
  const title = album.title[locale];
  const place = album.location?.[locale]?.trim();

  return (
    <BrandBorder
      variant="hover"
      as="article"
      className={["album-card photo-stack-host", className].filter(Boolean).join(" ")}
    >
      <Link
        href={href ?? `/media/albums/${album.slug}`}
        className={`album-card__link ${BRAND_FOCUSABLE} ${BRAND_FOCUS_WIDE}`}
        aria-labelledby={titleId}
        aria-describedby={detailsId}
      >
        <Surface kind="raised" as="div" className="album-card__body">
          <PhotoStack
            photos={album.previewPhotos}
            locale={locale}
            overlay={<AssociationChips items={affiliations} placement="media" />}
          />

          <Heading id={titleId} className="album-card__title text-title">
            {title}
          </Heading>

          <div id={detailsId} className="flex flex-col gap-3">
            {album.eventDate || place ? (
              <p className="album-card__meta text-caption">
                {album.eventDate ? (
                  <span className="album-card__meta-item">
                    <CalendarIcon />
                    <span className={BRAND_VISUALLY_HIDDEN}>{t("dateLabel")}: </span>
                    <PublishDate date={album.eventDate} />
                  </span>
                ) : null}
                {place ? (
                  <span className="album-card__meta-item">
                    <PinIcon />
                    <span className={BRAND_VISUALLY_HIDDEN}>{t("placeLabel")}: </span>
                    {place}
                  </span>
                ) : null}
              </p>
            ) : null}

            <span className="album-card__footer text-body-sm">
              <span className="album-card__browse font-bold" aria-hidden="true">
                {t("browse")}
                <ArrowIcon />
              </span>
              <span className="album-card__count text-caption font-bold">
                <PhotoIcon />
                {t("photoCount", { count: album.assetCount })}
              </span>
            </span>
          </div>
        </Surface>
      </Link>
    </BrandBorder>
  );
};

/* Line icons at the stroke weight the rest of the site's meta rows use. All
   decorative: the text beside each one says what it marks. */

const CalendarIcon = () => (
  <svg className="album-card__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

const PinIcon = () => (
  <svg className="album-card__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

const PhotoIcon = () => (
  <svg className="album-card__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M21 16l-5-5-8 8" />
  </svg>
);

const ArrowIcon = () => (
  <svg className="album-card__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
