import { useId } from "react";
import { useTranslations } from "next-intl";
import { BRAND_VISUALLY_HIDDEN, Button, Surface } from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { PublishDate } from "@/components/pages/news/publish-date";
import { CalendarIcon, ForwardArrow, PhotoIcon, PinIcon } from "@/components/pages/albums/meta-icons";
import { AssociationChips } from "@/components/shared/albums/association-chips";
import { FeaturedAlbumDeck } from "@/components/shared/albums/featured-album-deck";
import { albumAffiliations } from "@/lib/albums/affiliations";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The album the homepage section leads with: the gallery page's featured card
 * (`featured-album.tsx`) at a smaller dose — no badge, no description, tighter
 * padding — because here it introduces a row of cards rather than a page.
 *
 * No badge, because the lead is the featured album only when an editor marked
 * one; otherwise it is simply the newest, and "Featured" would be untrue.
 *
 * On ink with the mesh as its cue: ink measures 1.05:1 against the dark page
 * ground, so without it the card stops being a region in dark theme
 * (`surface-adjacency-contract.spec.ts`).
 *
 * The deck turns only with five covers, and the list shape carries at most
 * three preview photos, so on the homepage it is always drawn at rest — which
 * is also why it needs no pause control here. Words-first in the source so a
 * screen reader meets the title before the pictures; the deck is moved first
 * visually on a phone, as the gallery page's card does.
 *
 * Only the button is a link: the deck may carry a control of its own, and a
 * link wrapping a button is invalid and unreachable.
 */
export const LeadAlbum = ({ album, locale }: { album: AlbumListItem; locale: AppLocale }) => {
  const t = useTranslations("home.albums");
  const tCard = useTranslations("albums.card");
  const titleId = useId();
  const place = album.location?.[locale]?.trim();
  const covers = album.previewPhotos.map((photo) => ({ id: photo.id, photo }));
  const affiliations = albumAffiliations(album, locale);

  return (
    // The article carries the name and the rounding; `Surface` takes no ARIA
    // attributes, by design, so it is the ground inside rather than the region.
    <article
      aria-labelledby={titleId}
      className="overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--elevation-panel)]"
    >
      <Surface kind="ink" mesh as="div" className={covers.length > 0 ? "grid lg:grid-cols-2" : "grid"}>
        <div className="flex flex-col items-start gap-4 p-6 max-lg:order-2 lg:justify-center lg:p-8">
          <AssociationChips items={affiliations} placement="hero" />

          <h3 id={titleId} className="text-h3 text-[color:var(--surface-text)]">
            {album.title[locale]}
          </h3>

          <ul className="flex flex-col gap-2 text-body-sm text-[color:var(--surface-text)]">
            {album.eventDate ? (
              <li className="flex items-center gap-2">
                <CalendarIcon />
                <span className={BRAND_VISUALLY_HIDDEN}>{tCard("dateLabel")}: </span>
                <PublishDate date={album.eventDate} />
              </li>
            ) : null}
            {place ? (
              <li className="flex items-center gap-2">
                <PinIcon />
                <span className={BRAND_VISUALLY_HIDDEN}>{tCard("placeLabel")}: </span>
                {place}
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <PhotoIcon />
              {tCard("photoCount", { count: album.assetCount })}
            </li>
          </ul>

          <Button
            href={`/media/albums/${album.slug}`}
            linkComponent={Link}
            // "View album" alone, read in a list of links, would not say which.
            aria-describedby={titleId}
            className="mt-2 max-lg:w-full max-lg:justify-center"
          >
            {t("openAlbum")}
            <ForwardArrow />
          </Button>
        </div>

        {covers.length > 0 ? (
          <div className="flex items-center justify-center p-6 max-lg:order-1 lg:p-8">
            <FeaturedAlbumDeck covers={covers} locale={locale} />
          </div>
        ) : null}
      </Surface>
    </article>
  );
};
