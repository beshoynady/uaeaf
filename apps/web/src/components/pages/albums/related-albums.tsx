import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  BRAND_CONTAINER,
  Button,
  SectionHeading,
  Surface,
} from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { AlbumCard } from "@/components/shared/albums/album-card";
import { albumAffiliations } from "@/lib/albums/affiliations";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { AppLocale } from "@/i18n/routing";

/**
 * «ألبومات ذات صلة»: four cards on desktop, two on a phone, and the way back
 * to the whole gallery.
 *
 * All four are in the markup at every width and the third and fourth are
 * hidden below `lg`, so the strip is one list whose order a screen reader and
 * a sighted reader share. Nothing is drawn when the album has no related
 * albums: a heading over an empty strip is a promise with nothing behind it.
 */
export const RelatedAlbums = ({
  albums,
  locale,
}: {
  albums: readonly AlbumListItem[];
  locale: AppLocale;
}) => {
  const t = useTranslations("albums.page.album");
  const headingId = useId();

  if (albums.length === 0) return null;

  return (
    // `Surface` takes no ARIA attributes, so the named region wraps it.
    <section aria-labelledby={headingId}>
      <Surface kind="canvas" as="div" className="py-16">
        <div className={`${BRAND_CONTAINER} flex flex-col gap-8`}>
          <SectionHeading
            title={<span id={headingId}>{t("related")}</span>}
            action={
              <Button href="/media/albums" linkComponent={Link} variant="ghost">
                {t("allAlbums")}
              </Button>
            }
          />
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {albums.map((album, index) => (
              <li
                key={album.id}
                className={`min-w-0 ${index >= 2 ? "max-lg:hidden" : ""}`}
              >
                <AlbumCard
                  album={album}
                  locale={locale}
                  affiliations={albumAffiliations(album, locale)}
                />
              </li>
            ))}
          </ul>
        </div>
      </Surface>
    </section>
  );
};
