import { useTranslations } from "next-intl";
import type { BreadcrumbItem } from "@uaeaf/brand-ui";
import { albumAffiliations } from "@/lib/albums/affiliations";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { ViewerPhoto } from "@/lib/albums/photo-window";
import { BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { AlbumJsonLd } from "./album-json-ld";
import { AlbumPhotos } from "./album-photos";
import { AlbumHero } from "./album-hero";
import { RelatedAlbums } from "./related-albums";

/** The viewer's anchor, which the hero's play button links to. */
export const ALBUM_VIEWER_ID = "album-photos";

/**
 * One album's composition, below its route (approved canvases
 * `albumview-desktop-*.png`, `albumview-mobile-*.png`): the hero, the photos,
 * and the albums related to this one.
 *
 * -- Photos, forty at a time -----------------------------------------------------
 *
 * The server renders the first page of `GET /albums/public/:slug?skip=` (or
 * the pages up to the photo `?photo=` names), and `AlbumPhotos` appends the
 * next page whenever the viewer's window nears the end of what it holds.
 * `total` is the album's `photoTotal`, so the counter, the progress lane and
 * the hero's count all speak of the whole album from the first paint.
 */
export const AlbumScreen = ({
  locale,
  album,
  photos,
  photoTotal,
  cover,
  related,
  initialPhotoId,
  galleryName,
}: {
  locale: AppLocale;
  album: Omit<AlbumListItem, "previewPhotos">;
  /** The photos the server read: the first page, or up to `initialPhotoId`. */
  photos: readonly ViewerPhoto[];
  /** Visible photos in the whole album (`photoTotal`). */
  photoTotal: number;
  cover: MediaAssetPublic | undefined;
  related: readonly AlbumListItem[];
  initialPhotoId: string | null;
  /** The gallery's own name, for the trail. */
  galleryName: string;
}) => {
  const tNav = useTranslations("Nav");
  const title = album.title[locale];
  const place = album.location?.[locale]?.trim() || undefined;
  const description = album.description?.[locale]?.trim() || undefined;
  const route = `/media/albums/${album.slug}`;

  // IA §8.5: depth two, so the trail is shown. The Media Centre is in
  // neither trail: it has no page for `BreadcrumbList` to point at, and the
  // kit would draw a step without a link as a second "current page".
  const trail = [
    { name: tNav("home"), route: "/" },
    { name: galleryName, route: "/media/albums" },
    { name: title, route },
  ];
  const href = (path: string) =>
    path === "/" ? `/${locale}` : `/${locale}${path}`;
  const breadcrumb: BreadcrumbItem[] = trail.map((crumb, index) =>
    index === trail.length - 1
      ? { label: crumb.name }
      : { label: crumb.name, href: href(crumb.route) },
  );

  // The cover may sit past the photos read so far; it is described from its
  // own record then, since the hero shows it either way.
  const coverPhoto: ViewerPhoto | undefined = cover
    ? (photos.find((photo) => photo.id === cover.id) ?? {
        id: cover.id,
        src: cover.file.url,
        width: cover.file.width,
        height: cover.file.height,
        alt: cover.altText[locale] ?? "",
      })
    : undefined;

  return (
    <>
      <AlbumJsonLd
        locale={locale}
        slug={album.slug}
        name={title}
        description={description}
        eventDate={album.eventDate}
        place={place}
        cover={coverPhoto}
        photos={photos}
      />
      <BreadcrumbJsonLd locale={locale} trail={trail} />

      <AlbumHero
        locale={locale}
        title={title}
        eventDate={album.eventDate}
        place={place}
        photoCount={photoTotal}
        affiliations={albumAffiliations(album, locale)}
        cover={cover}
        breadcrumb={breadcrumb}
        viewerId={ALBUM_VIEWER_ID}
      />

      <AlbumPhotos
        slug={album.slug}
        locale={locale}
        photos={photos}
        total={photoTotal}
        initialPhotoId={initialPhotoId}
        id={ALBUM_VIEWER_ID}
      />

      <RelatedAlbums albums={related} locale={locale} />
    </>
  );
};
