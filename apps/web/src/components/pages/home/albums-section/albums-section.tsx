import { useId } from "react";
import { useTranslations } from "next-intl";
import { BRAND_CONTAINER, Button, SectionHeading, Surface } from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { ChevronIcon } from "@/components/ui/chevron-icon";
import { AlbumCard } from "@/components/shared/albums/album-card";
import { albumAffiliations } from "@/lib/albums/affiliations";
import type { AppLocale } from "@/i18n/routing";
import { LeadAlbum } from "./lead-album";
import type { PhotoGallerySectionPublic } from "./load";

const ALBUMS_PATH = "/media/albums";

/**
 * The homepage's albums section: the Media Centre's photographs, built from
 * the gallery page's own parts at a smaller dose — its featured card, compact,
 * and its album cards.
 *
 * Everything it shows is the API's answer. How many cards, which album leads
 * and the words over them are the editor's (`PHOTO_GALLERY` row), so nothing
 * here caps, pads or re-selects them.
 *
 * Absent, not empty, when the editor switched it off or there is nothing to
 * show: a heading over nothing is worse than no section
 * (`docs/plans/homepage-hero-design.md` §6.4), which is how the news and video
 * sections behave too.
 *
 * "All albums" sits beside the heading from `lg`, and after the cards below
 * it, so on a phone it is reached once the reader has seen what it leads to.
 * The breakpoint is the gallery page's own split between its desktop pager and
 * its phone button.
 *
 * Server Component: the deck inside the lead card is the only client part.
 */
export const HomeAlbumsSection = ({
  section,
  locale,
}: {
  section: PhotoGallerySectionPublic | null;
  locale: AppLocale;
}) => {
  const t = useTranslations("home.albums");
  const headingId = useId();

  // TODO(isActive): hide this section while the albums page is inactive — wire when pages.isActive lands
  if (!section?.enabled) return null;

  const { lead, items } = section;
  if (!lead && items.length === 0) return null;

  // An editor who cleared the heading still leaves a region that needs a
  // name, so the catalogue's words stand in for theirs.
  const title = section.title?.[locale]?.trim() || t("title");
  const subtitle = section.subtitle?.[locale]?.trim() || undefined;
  const eyebrow = section.eyebrow?.[locale]?.trim();

  const allAlbums = (className: string) => (
    // The locale-aware `Link`: the kit's default `next/link` would drop the
    // `/ar` or `/en` prefix and let the middleware guess it from a cookie.
    <Button href={ALBUMS_PATH} linkComponent={Link} variant="secondary" className={className}>
      {t("allAlbums")}
      <ChevronIcon direction="forward" />
    </Button>
  );

  return (
    // `Surface` takes no ARIA attributes, so the named region wraps it.
    <section aria-labelledby={headingId}>
      <Surface kind="canvas" as="div" className="py-16">
        <div className={`${BRAND_CONTAINER} flex flex-col gap-8`}>
          <div className="flex flex-col gap-3">
            {eyebrow ? (
              <p className="text-caption font-bold text-[color:var(--surface-text-muted)]">{eyebrow}</p>
            ) : null}
            <SectionHeading
              title={<span id={headingId}>{title}</span>}
              description={subtitle}
              action={allAlbums("")}
              // The kit's action wrapper (the header's last child), hidden
              // whole below `lg` rather than emptied: an empty flex item still
              // wraps onto its own line and opens a gap under the description.
              className="max-lg:[&>:last-child]:hidden"
            />
          </div>

          {lead ? <LeadAlbum album={lead} locale={locale} /> : null}

          {items.length > 0 ? (
            /* The gallery grid's steps (IA §12 [B]: one column under 640px,
               two from 640px), ending at three from 1024px as this section's
               brief sets rather than the archive's four. */
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((album) => (
                <li key={album.id} className="min-w-0">
                  <AlbumCard
                    album={album}
                    locale={locale}
                    affiliations={albumAffiliations(album, locale)}
                    headingLevel="h3"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <div className="lg:hidden">{allAlbums("w-full justify-center")}</div>
        </div>
      </Surface>
    </section>
  );
};
