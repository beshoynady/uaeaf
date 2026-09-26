import { useId } from "react";
import { useTranslations } from "next-intl";
import { BRAND_VISUALLY_HIDDEN, Button, Surface } from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { PublishDate } from "@/components/pages/news/publish-date";
import { FeaturedAlbumDeck } from "@/components/shared/albums/featured-album-deck";
import type { DeckCover } from "@/components/shared/albums/types";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { AppLocale } from "@/i18n/routing";
import { CalendarIcon, ForwardArrow, PhotoIcon, PinIcon } from "./meta-icons";

/**
 * The featured album, laid over the hero's foot (approved canvas
 * `albums-main.png`): the words at the reading edge, the turning deck of its
 * covers beside them.
 *
 * On ink, with the mesh as its first child: ink measures 1.05:1 against the
 * dark page ground, so without a cue that is not the ground the card stops
 * being a region in dark theme (`surface-adjacency-contract.spec.ts`).
 *
 * On a phone the canvas puts the deck first and the words under it, with the
 * button across the card's width; the source order stays words-first so a
 * screen reader meets the title before the pictures it describes.
 *
 * Only the button is a link. The deck is a control of its own (its pause
 * button), and a link wrapping a button is invalid and unreachable.
 */
export const FeaturedAlbum = ({
  album,
  covers,
  locale,
}: {
  album: AlbumListItem;
  covers: readonly DeckCover[];
  locale: AppLocale;
}) => {
  const t = useTranslations("albums.page.featured");
  const tCard = useTranslations("albums.card");
  const titleId = useId();
  const description = album.description?.[locale]?.trim();
  const place = album.location?.[locale]?.trim();

  return (
    // The article carries the name and the rounding; `Surface` takes no ARIA
    // attributes, by design, so it is the ground inside rather than the region.
    <article
      aria-labelledby={titleId}
      className="overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--elevation-panel)]"
    >
      <Surface kind="ink" mesh as="div" className="grid lg:grid-cols-2">
        <div className="flex flex-col items-start gap-4 p-6 max-lg:order-2 lg:justify-center lg:p-12">
          <span className="rounded-[var(--radius-sm)] bg-[color:var(--color-brand-primary)] px-3 py-1 text-caption font-bold text-[color:var(--color-text-on-brand)]">
            {t("badge")}
          </span>

          <h2 id={titleId} className="text-h2 text-[color:var(--surface-text)]">
            {album.title[locale]}
          </h2>

          {description ? (
            <p className="max-w-prose text-body text-[color:var(--surface-text-muted)]">
              {description}
            </p>
          ) : null}

          <ul className="flex flex-col gap-2 text-body-sm text-[color:var(--surface-text)]">
            {album.eventDate ? (
              <li className="flex items-center gap-2">
                <CalendarIcon />
                <span className={BRAND_VISUALLY_HIDDEN}>{t("date")}: </span>
                <PublishDate date={album.eventDate} />
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
              {tCard("photoCount", { count: album.assetCount })}
            </li>
          </ul>

          <Button
            href={`/media/albums/${album.slug}`}
            linkComponent={Link}
            // The title is the destination's name; "view album" alone, read in
            // a list of links, would not say which one.
            aria-describedby={titleId}
            className="mt-2 max-lg:w-full max-lg:justify-center"
          >
            {t("open")}
            <ForwardArrow />
          </Button>
        </div>

        <div className="flex items-center justify-center p-6 max-lg:order-1 lg:p-12">
          <FeaturedAlbumDeck covers={covers} locale={locale} />
        </div>
      </Surface>
    </article>
  );
};
