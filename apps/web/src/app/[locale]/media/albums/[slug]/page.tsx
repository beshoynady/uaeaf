import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlbumScreen } from "@/components/pages/albums/album-screen";
import { buildMetadata } from "@/lib/seo/metadata";
import type { AppLocale } from "@/i18n/routing";
import {
  loadAlbumDetail,
  loadAlbumThrough,
  loadCover,
  loadRelatedAlbums,
  toViewerPhoto,
} from "../_data/load";
import { withShareImage } from "../_data/seo";

/**
 * One album, at `/media/albums/<slug>`.
 *
 * -- A slug that names nothing is a 404 -----------------------------------------
 *
 * The API answers HTTP 200 with a `null` body for a slug that names no
 * published album — the convention of every public `:slug` read here — and
 * `fetchPublic` returns `null` for it. A draft, an archived album and a slug
 * nobody used all read the same, and none of them should disclose which it is.
 *
 * -- Fetched twice, costing once --------------------------------------------------
 *
 * `generateMetadata` and the page both read the album; Next dedupes identical
 * requests within one render, the arrangement the news article uses too.
 *
 * Rendered per request, because `?photo=` decides which photo the server draws
 * first; the read underneath is cached for `PUBLIC_REVALIDATE_SECONDS`.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> => {
  const { locale, slug } = await params;
  const detail = await loadAlbumDetail(slug, 0);

  if (!detail) {
    // Nothing to describe and nothing to index; the body answers 404.
    return { robots: { index: false, follow: true } };
  }

  const [t, site] = await Promise.all([
    getTranslations({ locale, namespace: "albums.seo" }),
    getTranslations({ locale, namespace: "Metadata" }),
  ]);
  const title = detail.album.title[locale];

  return withShareImage(
    buildMetadata({
      locale,
      route: `/media/albums/${detail.album.slug}`,
      title: `${title} | ${site("title")}`,
      // The editor's description where there is one; otherwise one sentence
      // naming the album, rather than the site's generic description.
      description:
        detail.album.description?.[locale]?.trim() ||
        t("albumDescription", { title }),
      indexable: true,
    }),
    await loadCover(detail),
    locale,
  );
};

const readPhotoParam = (
  value: string | string[] | undefined,
): string | null => {
  const id = Array.isArray(value) ? value[0] : value;
  return id && /^[a-f\d]{24}$/i.test(id) ? id : null;
};

const AlbumPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // TODO(isActive): wire when pages.isActive lands

  // Shape-checked only. An id that is not in this album opens it on the
  // first photo — the viewer's own rule — rather than erroring.
  const photoId = readPhotoParam((await searchParams).photo);

  // The first page of photos, or as many pages as it takes to reach the one
  // the address names, so the server draws that photo first.
  const detail = await loadAlbumThrough(slug, photoId);
  if (!detail) notFound();

  const [related, cover, pages] = await Promise.all([
    loadRelatedAlbums(detail),
    loadCover(detail),
    getTranslations({ locale, namespace: "Pages" }),
  ]);

  return (
    <AlbumScreen
      locale={locale}
      album={detail.album}
      photos={detail.mediaAssets.map((asset) => toViewerPhoto(asset, locale))}
      photoTotal={detail.photoTotal}
      cover={cover}
      related={related}
      initialPhotoId={photoId}
      galleryName={pages("albums")}
    />
  );
};

export default AlbumPage;
