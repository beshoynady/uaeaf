import { JsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, SITE_ORIGIN } from "@/lib/seo/metadata";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { ViewerPhoto } from "@/lib/albums/photo-window";
import type { AppLocale } from "@/i18n/routing";

/**
 * The album pages' structured data (Chapter 14 §4).
 *
 * `ImageGallery` for both, because it is what both pages are: schema.org
 * places it under `CollectionPage`, which is the type the page registry
 * records for this route, so the claim narrows the registered one rather than
 * contradicting it.
 *
 * §4's constraint shapes every field: nothing is described that the page does
 * not show. The archive lists only the albums on screen, and an album lists
 * only photos the viewer holds, each with the credit only where the page
 * prints one.
 */

/** The archive: the page itself, and the albums a reader can see on it. */
export const AlbumsGalleryJsonLd = ({
  locale,
  route,
  name,
  description,
  albums,
}: {
  locale: AppLocale;
  route: string;
  name: string;
  description: string;
  albums: readonly AlbumListItem[];
}) => (
  <JsonLd
    data={{
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name,
      description,
      url: absoluteUrl(locale, route),
      inLanguage: locale,
      isPartOf: { "@id": `${SITE_ORIGIN}/#organization` },
      ...(albums.length > 0
        ? {
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: albums.length,
              itemListElement: albums.map((album, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: album.title[locale],
                url: absoluteUrl(locale, `/media/albums/${album.slug}`),
              })),
            },
          }
        : {}),
    }}
  />
);

/**
 * Photos described per album: the first page the server rendered. Later pages
 * arrive in the browser, and a graph of several hundred `ImageObject`s would
 * say nothing a crawler needs past the first screenful anyway.
 */
const DESCRIBED_PHOTOS = 40;

const imageObject = (photo: ViewerPhoto) => ({
  "@type": "ImageObject",
  contentUrl: photo.src,
  width: photo.width,
  height: photo.height,
  ...(photo.alt ? { description: photo.alt } : {}),
  ...(photo.caption ? { caption: photo.caption } : {}),
  ...(photo.credit ? { creditText: photo.credit } : {}),
});

/** One album: its title, its date and place where the hero prints them, its
 *  cover, and its photos. */
export const AlbumJsonLd = ({
  locale,
  slug,
  name,
  description,
  eventDate,
  place,
  cover,
  photos,
}: {
  locale: AppLocale;
  slug: string;
  name: string;
  description?: string;
  eventDate?: string | null;
  place?: string;
  cover?: ViewerPhoto;
  photos: readonly ViewerPhoto[];
}) => (
  <JsonLd
    data={{
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name,
      ...(description ? { description } : {}),
      url: absoluteUrl(locale, `/media/albums/${slug}`),
      inLanguage: locale,
      isPartOf: { "@id": `${SITE_ORIGIN}/#organization` },
      ...(eventDate ? { dateCreated: eventDate } : {}),
      ...(place ? { contentLocation: { "@type": "Place", name: place } } : {}),
      ...(cover ? { primaryImageOfPage: imageObject(cover) } : {}),
      ...(photos.length > 0
        ? { image: photos.slice(0, DESCRIBED_PHOTOS).map(imageObject) }
        : {}),
    }}
  />
);
